package jp.reimagined.chappy;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.network.chat.Component;
import net.minecraft.server.MinecraftServer;
import net.minecraft.server.level.ServerPlayer;
import net.neoforged.neoforge.network.PacketDistributor;

public final class Conversations {
    private static final class GatewayFailure extends Exception {
        final int status;
        GatewayFailure(int status) { this.status = status; }
    }
    private static final HttpClient HTTP = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(5))
            .followRedirects(HttpClient.Redirect.NEVER).build();
    // Only touched by the Minecraft server thread. Workers post results back to that thread.
    private final Map<UUID, Session> sessions = new HashMap<>();
    private static final class Session {
        final String id = UUID.randomUUID().toString();
        Thread task;
        int npc;
        long started;
        long lastRequest;
        Thread progressTask;
        String progress = "調べているよ…";
    }
    public void login(ServerPlayer player) { logout(player); sessions.put(player.getUUID(), new Session()); }
    public void logout(ServerPlayer player) {
        Session old = sessions.remove(player.getUUID());
        if (old != null && old.task != null) old.task.interrupt();
        if (old != null && old.progressTask != null) old.progressTask.interrupt();
        if (old != null) closeRemote(player.getUUID(), old.id);
    }
    public void stop() {
        sessions.forEach((id, s) -> { if (s.task != null) s.task.interrupt(); if (s.progressTask != null) s.progressTask.interrupt(); closeRemote(id, s.id); });
        sessions.clear();
    }
    private void closeRemote(UUID player, String session) {
        String url = Settings.GATEWAY.get(); String token = Settings.TOKEN.get();
        if (token.isBlank()) return;
        Thread.startVirtualThread(() -> {
            try {
                var body = new JsonObject(); body.addProperty("playerId", player.toString()); body.addProperty("sessionId", session);
                HTTP.send(request(url + "/v1/session/close", token, body, 5), HttpResponse.BodyHandlers.discarding());
            } catch (Exception ignored) { /* Gateway also expires disconnected sessions. */ }
        });
    }
    private static HttpRequest request(String url, String token, JsonObject body, int seconds) {
        URI uri = URI.create(url);
        if (!"http".equals(uri.getScheme()) || !"127.0.0.1".equals(uri.getHost()))
            throw new IllegalArgumentException("Development gateway must use http://127.0.0.1");
        return HttpRequest.newBuilder(uri).timeout(Duration.ofSeconds(seconds))
                .header("Authorization", "Bearer " + token).header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body.toString())).build();
    }
    private void status(ServerPlayer player, int npc, String state, String text) {
        PacketDistributor.sendToPlayer(player, new Packets.Status(npc, state, text));
        if (state.equals("error")) player.sendSystemMessage(Component.literal("チャッピー: " + text));
    }
    public void ask(ServerPlayer player, Packets.Ask packet) {
        if (!(player.containerMenu instanceof ChappyMenu menu) || menu.containerId != packet.menuId() || !menu.stillValid(player)) return;
        String question = packet.question().strip();
        if (question.isEmpty() || question.length() > 1000 || question.codePoints().anyMatch(c -> Character.isISOControl(c))) {
            status(player, menu.npcId, "error", "質問を1〜1000文字で入力してね。"); return;
        }
        boolean bookRequested = BookText.requested(question);
        Session session = sessions.get(player.getUUID());
        if (session == null) { login(player); session = sessions.get(player.getUUID()); }
        if (session.task != null) { status(player, menu.npcId, "thinking", "今の質問を調べているよ…"); return; }
        long now = System.currentTimeMillis();
        if (now - session.lastRequest < 2000) { status(player, menu.npcId, "error", "少し待ってから送ってね。"); return; }
        String token = Settings.TOKEN.get(), url = Settings.GATEWAY.get();
        if (token.isBlank()) { status(player, menu.npcId, "error", "案内所への接続がまだ準備できていないみたい。"); return; }
        PhotoBridge.Snapshot photo;
        try { photo = PhotoBridge.capture(player, packet.photoSlot()); }
        catch (IllegalArgumentException e) { status(player, menu.npcId, "error", e.getMessage()); return; }
        var body = new JsonObject();
        body.addProperty("playerId", player.getUUID().toString()); body.addProperty("sessionId", session.id);
        body.addProperty("npcId", player.level().getEntity(menu.npcId).getUUID().toString());
        body.addProperty("question", question);
        body.add("scene", LocalScene.capture(player));
        body.add("memory", MemoryData.get(player.server).read(player.getUUID()));
        body.addProperty("outputMode", bookRequested ? "book" : "chat");
        body.addProperty("knowledgeId", Chappy.KNOWLEDGE.snapshotId());
        var items = new JsonArray();
        for (int i = 0; i < player.getInventory().getContainerSize(); i++) {
            var stack = player.getInventory().getItem(i);
            if (stack.isEmpty()) continue;
            var item = new JsonObject(); item.addProperty("slot", i);
            item.addProperty("id", BuiltInRegistries.ITEM.getKey(stack.getItem()).toString());
            item.addProperty("name", stack.getHoverName().getString().substring(0, Math.min(512, stack.getHoverName().getString().length())));
            item.addProperty("count", stack.getCount()); items.add(item);
        }
        body.add("items", new JsonArray());
        var inventory = new JsonObject();
        inventory.addProperty("selectedSlot", player.getInventory().selected);
        inventory.add("items", items); body.add("inventory", inventory);
        session.npc = menu.npcId; session.started = now; session.lastRequest = now; session.progress = "調べているよ…";
        status(player, menu.npcId, "accepted", "うん、聞いたよ。少し調べてみるね。");
        player.closeContainer(); // Close only after validation, so the Ask packet cannot race a client close.
        final Session expected = session;
        UUID playerId = player.getUUID(); MinecraftServer server = player.server;
        Thread task = Thread.ofVirtual().unstarted(() -> {
            String answer;
            JsonArray updatedMemory = null;
            boolean failed = false;
            try {
                if (photo != null) body.addProperty("photo", photo.dataUrl());
                var response = HTTP.send(request(url + "/v1/ask", token, body, 90), HttpResponse.BodyHandlers.ofString());
                if (response.statusCode() != 200) throw new GatewayFailure(response.statusCode());
                var result = JsonParser.parseString(response.body()).getAsJsonObject();
                answer = result.get("answer").getAsString();
                if (result.has("memory")) updatedMemory = result.getAsJsonArray("memory");
                if (answer.isBlank() || answer.length() > 12000) throw new IllegalStateException("Invalid answer");
            } catch (InterruptedException cancelled) { Thread.currentThread().interrupt(); return;
            } catch (java.net.http.HttpTimeoutException e) {
                answer = "調査が時間内に終わらなかったよ。質問を一つに絞って、もう一度聞いてね。"; failed = true;
            } catch (GatewayFailure e) {
                answer = switch (e.status) {
                    case 504 -> "調査が時間内に終わらなかったよ。質問を一つに絞って、もう一度聞いてね。";
                    case 429 -> "今はほかの相談に対応しているよ。少し待ってから聞いてね。";
                    case 401, 403 -> "案内所の認証設定を確認する必要があるみたい。管理者に伝えてね。";
                    case 409 -> "会話をつなぎ直したよ。もう一度質問してね。";
                    default -> "案内所で回答の処理に失敗したみたい。もう一度聞いてね。";
                }; failed = true;
            } catch (Exception e) {
                answer = "ごめんね、今は案内所につながらないみたい。少し待ってからもう一度聞いてね。"; failed = true;
            }
            final JsonArray memories = updatedMemory;
            final String text = answer; final boolean error = failed;
            server.execute(() -> {
                if (sessions.get(playerId) != expected) return;
                ServerPlayer current = server.getPlayerList().getPlayer(playerId);
                expected.task = null;
                if (current == null) return;
                if (error) login(current); // A failed backend session is discarded; retry gets a fresh thread.
                // Send a literal component only to the requesting connection. Never execute model text.
                if (!error && memories != null) {
                    try { MemoryData.get(server).replace(playerId, memories); } catch (IllegalArgumentException ignored) {}
                }
                String delivered = text;
                if (bookRequested && !error) {
                    try { delivered = BookDelivery.give(current, text); }
                    catch (IllegalArgumentException invalidBook) { delivered = "本には長すぎたのでチャットで届けるね。短くまとめてと頼んでね。\n" + text; }
                }
                current.sendSystemMessage(Component.literal("チャッピー: " + delivered));
                PacketDistributor.sendToPlayer(current, new Packets.Status(expected.npc, error ? "error" : "complete",
                        error ? delivered : bookRequested ? "本の案内をチャット欄に届けたよ。" : "答えをチャット欄に届けたよ。"));
            });
        });
        session.task = task; task.start();
    }
    public void tick(MinecraftServer server) {
        if (server.getTickCount() % 20 != 0) return;
        for (var entry : sessions.entrySet()) {
            Session s = entry.getValue(); if (s.task == null) continue;
            ServerPlayer player = server.getPlayerList().getPlayer(entry.getKey()); if (player == null) continue;
            if (System.currentTimeMillis() - s.started > 95000) {
                s.task.interrupt(); s.task = null;
                // Invalidate the old worker before accepting a new request.
                login(player);
                status(player, s.npc, "error", "調査に時間がかかりすぎたみたい。もう一度聞いてね。");
                break;
            }
            status(player, s.npc, "thinking", s.progress);
            if (server.getTickCount() % 40 == 0 && s.progressTask == null) {
                UUID playerId = entry.getKey();
                long requestStarted = s.started;
                String url = Settings.GATEWAY.get(), token = Settings.TOKEN.get();
                s.progressTask = Thread.ofVirtual().unstarted(() -> {
                    String progress = null;
                    try {
                        var body = new JsonObject(); body.addProperty("playerId", playerId.toString()); body.addProperty("sessionId", s.id);
                        var response = HTTP.send(request(url + "/v1/progress", token, body, 5), HttpResponse.BodyHandlers.ofString());
                        if (response.statusCode() == 200) progress = JsonParser.parseString(response.body()).getAsJsonObject().get("message").getAsString();
                    } catch (Exception ignored) { /* Keep the last safe progress label. */ }
                    String message = progress;
                    server.execute(() -> {
                        if (sessions.get(playerId) != s) return;
                        s.progressTask = null;
                        if (s.task != null && s.started == requestStarted && message != null && message.length() <= 200) s.progress = message;
                    });
                });
                s.progressTask.start();
            }
        }
    }
}
