package jp.reimagined.chappy;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import net.minecraft.core.BlockPos;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.level.ClipContext;
import net.minecraft.world.phys.BlockHitResult;
import net.minecraft.world.phys.HitResult;
import net.neoforged.neoforge.capabilities.Capabilities;

public final class LocalScene {
    public static JsonObject capture(ServerPlayer player) {
        var root = new JsonObject(); var blocks = new JsonArray();
        var level = player.serverLevel(); var origin = player.blockPosition();
        root.addProperty("dimension", level.dimension().location().toString());
        root.addProperty("capturedAt", "question_submission"); root.addProperty("radius", 4);
        var hit = level.clip(new ClipContext(player.getEyePosition(), player.getEyePosition().add(player.getLookAngle().scale(8)),
                ClipContext.Block.OUTLINE, ClipContext.Fluid.NONE, player));
        if (hit.getType() == HitResult.Type.BLOCK && level.hasChunkAt(hit.getBlockPos())) root.add("lookingAt", block(player, hit.getBlockPos(), origin));
        int count = 0;
        var positions = BlockPos.betweenClosedStream(origin.offset(-4, -3, -4), origin.offset(4, 4, 4))
                .map(BlockPos::immutable).sorted(java.util.Comparator.comparingDouble(p -> p.distSqr(origin))).toList();
        for (BlockPos pos : positions) {
            if (!level.hasChunkAt(pos) || level.isEmptyBlock(pos)) continue;
            count++;
            if (blocks.size() < 128) blocks.add(block(player, pos, origin));
        }
        root.add("blocks", blocks); root.addProperty("truncated", count > blocks.size());
        root.addProperty("limits", "質問者の近くの読み込み済みブロックのみ。位置は本人からの相対座標。最大128件。状態プロパティと蓄電量のみで、機械の処理内容・内部在庫・回路の正しさは未確認。写真の撮影場所とは別の場合がある。");
        return root;
    }
    private static JsonObject block(ServerPlayer player, BlockPos pos, BlockPos origin) {
        var level = player.serverLevel(); var state = level.getBlockState(pos); var b = new JsonObject();
        b.addProperty("id", BuiltInRegistries.BLOCK.getKey(state.getBlock()).toString());
        b.addProperty("dx", pos.getX() - origin.getX()); b.addProperty("dy", pos.getY() - origin.getY()); b.addProperty("dz", pos.getZ() - origin.getZ());
        var properties = new JsonObject(); state.getValues().forEach((key, value) -> properties.addProperty(key.getName(), value.toString())); b.add("properties", properties);
        try {
            var energy = level.getCapability(Capabilities.EnergyStorage.BLOCK, pos, null);
            if (energy != null) { b.addProperty("energyStored", energy.getEnergyStored()); b.addProperty("energyCapacity", energy.getMaxEnergyStored()); }
        } catch (RuntimeException ignored) { b.addProperty("energyUnavailable", true); }
        return b;
    }
}
