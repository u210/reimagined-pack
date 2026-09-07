package jp.reimagined.chappy;

import io.github.mortuusars.exposure.ExposureServer;
import io.github.mortuusars.exposure.data.ColorPalettes;
import io.github.mortuusars.exposure.world.item.PhotographItem;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.world.item.ItemStack;
import net.neoforged.fml.ModList;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.util.Base64;
import javax.imageio.ImageIO;

public final class PhotoBridge {
    private PhotoBridge() {}
    public static boolean isPhoto(ItemStack stack) {
        return ModList.get().isLoaded("exposure") && stack.getItem() instanceof PhotographItem;
    }
    public record Snapshot(int width, int height, byte[] pixels, int[] palette) {
        public String dataUrl() throws java.io.IOException {
            int w = Math.min(width, 512), h = Math.max(1, height * w / width);
            if (h > 512) { h = 512; w = Math.max(1, width * h / height); }
            var image = new BufferedImage(w, h, BufferedImage.TYPE_INT_RGB);
            for (int y = 0; y < h; y++) for (int x = 0; x < w; x++) {
                int index = Byte.toUnsignedInt(pixels[(y * height / h) * width + x * width / w]);
                int color = index < palette.length ? palette[index] : 0xffffffff;
                image.setRGB(x, y, (color >>> 24) == 0 ? 0xffffff : color);
            }
            var bytes = new ByteArrayOutputStream(); ImageIO.write(image, "png", bytes);
            return "data:image/png;base64," + Base64.getEncoder().encodeToString(bytes.toByteArray());
        }
    }
    public static Snapshot capture(ServerPlayer player, int slot) {
        if (slot == -1) return null;
        if (slot < 0 || slot >= player.getInventory().getContainerSize()) throw new IllegalArgumentException("写真を選び直してね。");
        ItemStack stack = player.getInventory().getItem(slot);
        if (!isPhoto(stack)) throw new IllegalArgumentException("選んだ写真が持ち物にないよ。写真を選び直してね。");
        var frame = ((PhotographItem) stack.getItem()).getFrame(stack);
        String id = frame.identifier().id();
        if (id == null || !id.matches("[A-Za-z0-9_-]{1,200}")) throw new IllegalArgumentException("この写真の形式にはまだ対応していないよ。");
        var data = ExposureServer.exposureRepository().load(id).getData()
                .orElseThrow(() -> new IllegalArgumentException("写真の画像を読み込めなかったよ。現像済みの写真を選んでね。"));
        if (data.getWidth() < 1 || data.getHeight() < 1 || data.getWidth() > 2048 || data.getHeight() > 2048)
            throw new IllegalArgumentException("写真のサイズに対応できないよ。");
        return new Snapshot(data.getWidth(), data.getHeight(), data.getPixels().clone(),
                ColorPalettes.get(player.registryAccess(), data.getPaletteId()).value().colors().clone());
    }
}
