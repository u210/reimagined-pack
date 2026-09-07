package jp.reimagined.chappy;

import com.google.gson.JsonArray;
import com.mojang.authlib.GameProfile;
import io.github.mortuusars.exposure.Exposure;
import io.github.mortuusars.exposure.ExposureServer;
import io.github.mortuusars.exposure.data.ColorPalettes;
import io.github.mortuusars.exposure.world.camera.frame.Frame;
import io.github.mortuusars.exposure.world.level.storage.ExposureData;
import io.github.mortuusars.exposure.world.level.storage.ExposureIdentifier;
import net.minecraft.core.component.DataComponents;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.server.MinecraftServer;
import net.minecraft.world.entity.item.ItemEntity;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.Items;
import net.neoforged.neoforge.common.util.FakePlayerFactory;
import java.util.UUID;
import java.nio.file.Files;

/** Opt-in diagnostics for the isolated validation world, never run during ordinary play. */
public final class RuntimeChecks {
    private static void check(boolean ok, String message) { if (!ok) throw new IllegalStateException(message); }
    public static void run(MinecraftServer server) {
        if (!Boolean.getBoolean("chappy.selftest")) return;
        try {
            var player = FakePlayerFactory.get(server.overworld(), new GameProfile(UUID.fromString("0cd18fad-4cd9-4be3-bd23-3f811f953621"), "ChappyTest"));
            var spawn = server.overworld().getSharedSpawnPos(); player.moveTo(spawn.getX(), spawn.getY(), spawn.getZ());
            var memory = new MemoryData(); var notes = new JsonArray(); notes.add("拠点は白樺港");
            memory.replace(player.getUUID(), notes);
            var restored = MemoryData.load(memory.save(new CompoundTag(), server.registryAccess()), server.registryAccess());
            check(restored.read(player.getUUID()).equals(notes), "Memory save/load");
            check(restored.read(UUID.randomUUID()).isEmpty(), "Memory player separation");
            restored.forget(player.getUUID()); check(restored.read(player.getUUID()).isEmpty(), "Memory forget");
            player.getInventory().clearContent();
            BookDelivery.give(player, "確認用の本です。".repeat(50));
            check(player.getInventory().getItem(0).has(DataComponents.WRITTEN_BOOK_CONTENT), "Book delivery");
            for (int i = 0; i < 36; i++) player.getInventory().setItem(i, new ItemStack(Items.STONE, 64));
            BookDelivery.give(player, "満杯時の確認");
            var dropped = server.overworld().getEntitiesOfClass(ItemEntity.class, player.getBoundingBox().inflate(5), e -> e.getItem().is(Items.WRITTEN_BOOK));
            check(!dropped.isEmpty(), "Full inventory drop"); dropped.forEach(ItemEntity::discard);
            String id = "chappy_validation_photo";
            var data = new ExposureData(32, 32, new byte[1024], ColorPalettes.DEFAULT.location(), ExposureData.Tag.EMPTY);
            ExposureServer.exposureRepository().save(id, data);
            var photograph = new ItemStack(Exposure.Items.PHOTOGRAPH.get());
            photograph.set(Exposure.DataComponents.PHOTOGRAPH_FRAME, new Frame(ExposureIdentifier.id(id), Frame.EMPTY.type(), Frame.EMPTY.photographer(), Frame.EMPTY.entitiesInFrame(), Frame.EMPTY.extraData()));
            player.getInventory().setItem(0, photograph);
            var captured = PhotoBridge.capture(player, 0);
            check(captured.width() == 32 && captured.pixels().length == 1024, "Exposure capture");
            check(captured.dataUrl().startsWith("data:image/png;base64,"), "Exposure PNG");
            try { PhotoBridge.capture(player, 1); throw new IllegalStateException("Non-photo accepted"); } catch (IllegalArgumentException expected) {}
            photograph.set(Exposure.DataComponents.PHOTOGRAPH_FRAME, new Frame(ExposureIdentifier.id("../private"), Frame.EMPTY.type(), Frame.EMPTY.photographer(), Frame.EMPTY.entitiesInFrame(), Frame.EMPTY.extraData()));
            try { PhotoBridge.capture(player, 0); throw new IllegalStateException("Path accepted"); } catch (IllegalArgumentException expected) {}
            var pixels = new byte[128 * 128];
            for (int y = 0; y < 128; y++) for (int x = 64; x < 128; x++) pixels[y * 128 + x] = 1;
            var synthetic = new PhotoBridge.Snapshot(128, 128, pixels, new int[]{0xffff0000, 0xff0000ff});
            Files.writeString(net.neoforged.fml.loading.FMLPaths.GAMEDIR.get().resolve("photo-check.txt"), synthetic.dataUrl());
            var scene = LocalScene.capture(player); check(scene.has("blocks"), "Scene capture");
            player.getInventory().clearContent();
            Files.writeString(net.neoforged.fml.loading.FMLPaths.GAMEDIR.get().resolve("selftest-passed.txt"), "memory persistence/isolation/forget; book/drop; Exposure capture/PNG/path rejection; scene: passed");
            com.mojang.logging.LogUtils.getLogger().info("CHAPPY_RUNTIME_CHECKS_PASSED");
        } catch (Exception e) { com.mojang.logging.LogUtils.getLogger().error("CHAPPY_RUNTIME_CHECKS_FAILED", e); }
        finally { server.halt(false); }
    }
}
