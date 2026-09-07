package jp.reimagined.chappy;

import com.mojang.brigadier.Command;
import net.minecraft.commands.Commands;
import net.minecraft.core.registries.Registries;
import net.minecraft.network.chat.Component;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.InteractionHand;
import net.minecraft.world.InteractionResult;
import net.minecraft.world.SimpleMenuProvider;
import net.minecraft.world.entity.EntityType;
import net.minecraft.world.entity.npc.Villager;
import net.minecraft.world.inventory.MenuType;
import net.neoforged.bus.api.IEventBus;
import net.neoforged.fml.ModContainer;
import net.neoforged.fml.common.Mod;
import net.neoforged.fml.config.ModConfig;
import net.neoforged.neoforge.common.NeoForge;
import net.neoforged.neoforge.common.extensions.IMenuTypeExtension;
import net.neoforged.neoforge.event.RegisterCommandsEvent;
import net.neoforged.neoforge.event.entity.EntityJoinLevelEvent;
import net.neoforged.neoforge.event.entity.player.PlayerEvent;
import net.neoforged.neoforge.event.entity.player.PlayerInteractEvent;
import net.neoforged.neoforge.event.server.ServerStoppingEvent;
import net.neoforged.neoforge.event.server.ServerStartedEvent;
import net.neoforged.neoforge.event.OnDatapackSyncEvent;
import net.neoforged.neoforge.event.tick.ServerTickEvent;
import net.neoforged.neoforge.registries.DeferredRegister;
import java.util.function.Supplier;

@Mod(Chappy.ID)
public final class Chappy {
    public static final String ID = "chappy";
    public static final String TAG = "chappy.guide";
    private static final DeferredRegister<MenuType<?>> MENUS = DeferredRegister.create(Registries.MENU, ID);
    public static final Supplier<MenuType<ChappyMenu>> MENU = MENUS.register("conversation",
            () -> IMenuTypeExtension.create(ChappyMenu::new));
    public static final Conversations CONVERSATIONS = new Conversations();
    public static final KnowledgeExport KNOWLEDGE = new KnowledgeExport();

    public Chappy(IEventBus bus, ModContainer container) {
        MENUS.register(bus);
        bus.addListener(Packets::register);
        container.registerConfig(ModConfig.Type.COMMON, Settings.SPEC);
        NeoForge.EVENT_BUS.addListener(this::commands);
        NeoForge.EVENT_BUS.addListener(this::interact);
        NeoForge.EVENT_BUS.addListener(this::login);
        NeoForge.EVENT_BUS.addListener(this::logout);
        NeoForge.EVENT_BUS.addListener(this::tick);
        NeoForge.EVENT_BUS.addListener(this::stop);
        NeoForge.EVENT_BUS.addListener(this::entityLoaded);
        NeoForge.EVENT_BUS.addListener((ServerStartedEvent e) -> { KNOWLEDGE.start(e.getServer()); if (Boolean.getBoolean("chappy.selftest")) e.getServer().execute(() -> RuntimeChecks.run(e.getServer())); });
        NeoForge.EVENT_BUS.addListener((OnDatapackSyncEvent e) -> {
            if (e.getPlayer() == null) KNOWLEDGE.start(e.getPlayerList().getServer());
        });
    }

    private void commands(RegisterCommandsEvent event) {
        event.getDispatcher().register(Commands.literal("chappy")
            .then(Commands.literal("memory").executes(ctx -> {
                ServerPlayer player = ctx.getSource().getPlayerOrException();
                var notes = MemoryData.get(player.server).read(player.getUUID());
                player.sendSystemMessage(Component.literal("チャッピー: " + (notes.isEmpty() ? "まだ長く覚えていることはないよ。" : "覚えていることだよ。")));
                notes.forEach(note -> player.sendSystemMessage(Component.literal("・" + note.getAsString())));
                return Command.SINGLE_SUCCESS;
            }))
            .then(Commands.literal("forget").executes(ctx -> {
                ServerPlayer player = ctx.getSource().getPlayerOrException();
                CONVERSATIONS.login(player);
                MemoryData.get(player.server).forget(player.getUUID());
                player.sendSystemMessage(Component.literal("チャッピー: 記憶と今までの会話を忘れたよ。"));
                return Command.SINGLE_SUCCESS;
            }))
            .then(Commands.literal("summon").executes(ctx -> {
                ServerPlayer player = ctx.getSource().getPlayerOrException();
                GuideData data = GuideData.get(player.server);
                if (data.entries.size() >= Settings.MAX_GUIDES.get()) {
                    GuideData.Entry e = data.entries.getFirst();
                    player.sendSystemMessage(Component.literal("チャッピーは " + e.dimension() + " の "
                            + e.x() + ", " + e.y() + ", " + e.z() + " にいるよ。"));
                    return Command.SINGLE_SUCCESS;
                }
                Villager npc = EntityType.VILLAGER.create(player.serverLevel());
                if (npc == null) return 0;
                // Spawn at the player's known safe position, rather than inside an adjacent wall.
                npc.moveTo(player.getX(), player.getY(), player.getZ(), player.getYRot() + 180, 0);
                npc.addTag(TAG);
                npc.setCustomName(Component.literal("チャッピー"));
                npc.setCustomNameVisible(true);
                npc.setPersistenceRequired();
                npc.setNoAi(true);
                npc.setInvulnerable(true);
                npc.setSilent(true);
                if (!player.serverLevel().addFreshEntity(npc)) return 0;
                data.add(npc);
                player.sendSystemMessage(Component.literal("チャッピーを呼んだよ。右クリックで相談してね。"));
                return Command.SINGLE_SUCCESS;
            }))
            .then(Commands.literal("dismiss").requires(s -> s.hasPermission(2)).executes(ctx -> {
                // Administrative recovery also clears IDs for unloaded or previously removed guides.
                GuideData data = GuideData.get(ctx.getSource().getServer());
                for (var entry : data.entries) for (var level : ctx.getSource().getServer().getAllLevels()) {
                    var entity = level.getEntity(entry.id());
                    if (entity != null) entity.discard();
                }
                data.entries.clear(); data.setDirty();
                ctx.getSource().sendSuccess(() -> Component.literal("チャッピーの召喚登録を解除しました。"), false);
                return Command.SINGLE_SUCCESS;
            })));
    }

    private void interact(PlayerInteractEvent.EntityInteract event) {
        if (!event.getTarget().getTags().contains(TAG)) return;
        event.setCanceled(true);
        event.setCancellationResult(InteractionResult.SUCCESS);
        if (event.getHand() != InteractionHand.MAIN_HAND || !(event.getEntity() instanceof ServerPlayer player)) return;
        var npc = event.getTarget();
        npc.lookAt(net.minecraft.commands.arguments.EntityAnchorArgument.Anchor.EYES, player.getEyePosition());
        player.openMenu(new SimpleMenuProvider((id, inv, p) -> new ChappyMenu(id, inv, npc.getId()),
                Component.literal("チャッピーに相談")), buf -> buf.writeVarInt(npc.getId()));
    }

    private void entityLoaded(EntityJoinLevelEvent event) {
        if (event.getLevel().isClientSide() || !event.loadedFromDisk() || !event.getEntity().getTags().contains(TAG)) return;
        // A dismissed guide may have been in an unloaded chunk. Remove it when that chunk is loaded.
        if (GuideData.get(event.getLevel().getServer()).entries.stream().noneMatch(e -> e.id().equals(event.getEntity().getUUID()))) {
            event.setCanceled(true);
        }
    }

    private void login(PlayerEvent.PlayerLoggedInEvent event) {
        if (event.getEntity() instanceof ServerPlayer player) CONVERSATIONS.login(player);
    }
    private void logout(PlayerEvent.PlayerLoggedOutEvent event) {
        if (event.getEntity() instanceof ServerPlayer player) CONVERSATIONS.logout(player);
    }
    private void tick(ServerTickEvent.Post event) { KNOWLEDGE.tick(event.getServer()); CONVERSATIONS.tick(event.getServer()); }
    private void stop(ServerStoppingEvent event) { KNOWLEDGE.stop(); CONVERSATIONS.stop(); }
}
