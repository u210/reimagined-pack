package jp.reimagined.chappy;

import net.minecraft.network.RegistryFriendlyByteBuf;
import net.minecraft.network.codec.StreamCodec;
import net.minecraft.network.protocol.common.custom.CustomPacketPayload;
import net.minecraft.resources.ResourceLocation;
import net.minecraft.server.level.ServerPlayer;
import net.neoforged.neoforge.network.event.RegisterPayloadHandlersEvent;

public final class Packets {
    public record Ask(int menuId, String question, int photoSlot) implements CustomPacketPayload {
        public static final Type<Ask> TYPE = new Type<>(ResourceLocation.fromNamespaceAndPath(Chappy.ID, "ask"));
        public static final StreamCodec<RegistryFriendlyByteBuf, Ask> CODEC = StreamCodec.of(
            (buf, p) -> { buf.writeVarInt(p.menuId); buf.writeUtf(p.question, 1000); buf.writeVarInt(p.photoSlot); },
            buf -> new Ask(buf.readVarInt(), buf.readUtf(1000), buf.readVarInt()));
        @Override public Type<Ask> type() { return TYPE; }
    }
    public record Status(int npcId, String state, String message) implements CustomPacketPayload {
        public static final Type<Status> TYPE = new Type<>(ResourceLocation.fromNamespaceAndPath(Chappy.ID, "status"));
        public static final StreamCodec<RegistryFriendlyByteBuf, Status> CODEC = StreamCodec.of(
            (buf, p) -> { buf.writeVarInt(p.npcId); buf.writeUtf(p.state, 32); buf.writeUtf(p.message, 200); },
            buf -> new Status(buf.readVarInt(), buf.readUtf(32), buf.readUtf(200)));
        @Override public Type<Status> type() { return TYPE; }
    }
    // Client installs this callback. No client-only classes are referenced on the dedicated server.
    public static java.util.function.Consumer<Status> statusReceiver = status -> {};
    public static void register(RegisterPayloadHandlersEvent event) {
        var registrar = event.registrar("3");
        registrar.playToServer(Ask.TYPE, Ask.CODEC, (p, ctx) -> ctx.enqueueWork(() -> {
            if (ctx.player() instanceof ServerPlayer player) Chappy.CONVERSATIONS.ask(player, p);
        }));
        registrar.playToClient(Status.TYPE, Status.CODEC, (p, ctx) -> ctx.enqueueWork(() -> statusReceiver.accept(p)));
    }
}
