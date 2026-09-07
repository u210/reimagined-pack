package jp.reimagined.chappy.client;

import jp.reimagined.chappy.Chappy;
import jp.reimagined.chappy.Packets;
import net.minecraft.client.Minecraft;
import net.minecraft.client.gui.Font;
import net.minecraft.world.entity.EntityAttachment;
import net.neoforged.neoforge.client.ClientHooks;
import net.neoforged.neoforge.common.util.TriState;
import net.minecraft.core.particles.ParticleTypes;
import net.neoforged.api.distmarker.Dist;
import net.neoforged.bus.api.SubscribeEvent;
import net.neoforged.fml.common.EventBusSubscriber;
import net.neoforged.neoforge.client.event.RegisterMenuScreensEvent;
import net.neoforged.neoforge.common.NeoForge;
import net.neoforged.neoforge.client.event.RenderNameTagEvent;
import net.neoforged.neoforge.client.event.ClientPlayerNetworkEvent;
import net.minecraft.network.chat.Component;
import java.util.HashMap;
import java.util.UUID;

@EventBusSubscriber(modid = Chappy.ID, bus = EventBusSubscriber.Bus.MOD, value = Dist.CLIENT)
public final class ChappyClient {
    private record Bubble(String text, long expires) {}
    private static final HashMap<UUID, Bubble> bubbles = new HashMap<>();
    @SubscribeEvent public static void screens(RegisterMenuScreensEvent event) {
        event.register(Chappy.MENU.get(), ChappyScreen::new);
        NeoForge.EVENT_BUS.addListener(ChappyClient::nameTag);
        NeoForge.EVENT_BUS.addListener((ClientPlayerNetworkEvent.LoggingOut e) -> bubbles.clear());
        Packets.statusReceiver = status -> {
            var mc = Minecraft.getInstance();
            if (mc.screen instanceof ChappyScreen screen && screen.getMenu().npcId == status.npcId()) screen.status(status);
            if (mc.screen instanceof PhotoPicker picker) picker.status(status);
            if (mc.level == null) return;
            var npc = mc.level.getEntity(status.npcId());
            if (npc == null) return;
            if (status.state().equals("complete")) bubbles.remove(npc.getUUID());
            else bubbles.put(npc.getUUID(), new Bubble(status.message(), System.currentTimeMillis() + 4000));
            var particle = status.state().equals("complete") ? ParticleTypes.HAPPY_VILLAGER : ParticleTypes.ENCHANT;
            for (int i = 0; i < 8; i++) mc.level.addParticle(particle,
                    npc.getX() + (Math.random() - .5), npc.getY() + 2.1, npc.getZ() + (Math.random() - .5), 0, .04, 0);
        };
    }
    private static void nameTag(RenderNameTagEvent event) {
        Bubble bubble = bubbles.get(event.getEntity().getUUID());
        if (bubble == null) return;
        if (bubble.expires() < System.currentTimeMillis()) { bubbles.remove(event.getEntity().getUUID()); return; }
        // Vanilla name tags are single-line. Draw a separate, subdued status line underneath.
        var mc = Minecraft.getInstance();
        var npc = event.getEntity();
        var dispatcher = mc.getEntityRenderDispatcher();
        if (event.canRender() == TriState.FALSE || mc.options.hideGui || mc.player == null || npc.isInvisibleTo(mc.player)
                || !ClientHooks.isNameplateInRenderDistance(npc, dispatcher.distanceToSqr(npc))) return;
        var anchor = npc.getAttachments().getNullable(EntityAttachment.NAME_TAG, 0, npc.getViewYRot(event.getPartialTick()));
        if (anchor == null) return;
        var pose = event.getPoseStack();
        pose.pushPose();
        try {
            pose.translate(anchor.x, anchor.y + 0.5, anchor.z);
            pose.mulPose(dispatcher.cameraOrientation());
            pose.scale(0.025F, -0.025F, 0.025F);
            var text = Component.literal(bubble.text());
            float x = -mc.font.width(text) / 2F;
            int background = (int) (mc.options.getBackgroundOpacity(0.25F) * 255F) << 24;
            boolean seeThrough = !npc.isDiscrete();
            mc.font.drawInBatch(text, x, 12F, 0x20AAAAAA, false, pose.last().pose(), event.getMultiBufferSource(),
                    seeThrough ? Font.DisplayMode.SEE_THROUGH : Font.DisplayMode.NORMAL, background, event.getPackedLight());
            if (seeThrough) mc.font.drawInBatch(text, x, 12F, 0xFFAAAAAA, false, pose.last().pose(),
                    event.getMultiBufferSource(), Font.DisplayMode.NORMAL, 0, event.getPackedLight());
        } finally { pose.popPose(); }
    }
}
