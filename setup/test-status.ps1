param(
    [string]$ServerAddress = '127.0.0.1',
    [int]$ServerPort = 25565
)
$ErrorActionPreference = 'Stop'
$connection = [Net.Sockets.TcpClient]::new()
try {
    $connection.Connect($ServerAddress, $ServerPort)
    $stream = $connection.GetStream()
    $stream.ReadTimeout = 15000
    $stream.WriteTimeout = 15000
    # Minecraft 1.21.1 protocol 767; localhost; status request.
    $addressBytes = [Text.Encoding]::UTF8.GetBytes($ServerAddress)
    if ($addressBytes.Length -gt 127) { throw 'Server address is too long for this status probe' }
    $packetLength = 7 + $addressBytes.Length
    $portHigh = ($ServerPort -shr 8) -band 255
    $portLow = $ServerPort -band 255
    [byte[]]$request = @($packetLength, 0, 255, 5, $addressBytes.Length) + $addressBytes + @($portHigh, $portLow, 1, 1, 0)
    $stream.Write($request, 0, $request.Length)
    function Read-VarInt {
        $value = 0
        for ($i=0; $i -lt 5; $i++) {
            $b = $stream.ReadByte()
            if ($b -lt 0) { throw 'Unexpected end of stream' }
            $value = $value -bor (($b -band 127) -shl (7*$i))
            if (($b -band 128) -eq 0) { return $value }
        }
        throw 'Invalid VarInt'
    }
    $packetSize = Read-VarInt
    $packetId = Read-VarInt
    if ($packetId -ne 0) { throw "Unexpected status packet: $packetId" }
    $length = Read-VarInt
    if ($length -lt 1 -or $length -gt 2097152 -or $length -gt $packetSize) { throw 'Invalid response length' }
    $buffer = [byte[]]::new($length)
    $offset = 0
    while ($offset -lt $length) {
        $count = $stream.Read($buffer, $offset, $length-$offset)
        if ($count -eq 0) { throw 'Incomplete response' }
        $offset += $count
    }
    $status = [Text.Encoding]::UTF8.GetString($buffer) | ConvertFrom-Json
    [pscustomobject]@{Version=$status.version.name; Protocol=$status.version.protocol; Players=$status.players.online; MaxPlayers=$status.players.max; Description=$status.description} | ConvertTo-Json -Depth 8
} finally {
    $connection.Dispose()
}
