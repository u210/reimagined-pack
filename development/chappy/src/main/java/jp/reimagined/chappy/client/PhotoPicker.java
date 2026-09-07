package jp.reimagined.chappy.client;

import jp.reimagined.chappy.PhotoBridge;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.gui.components.Button;
import net.minecraft.client.gui.screens.Screen;
import net.minecraft.network.chat.Component;
import java.util.ArrayList;
import java.util.List;

public final class PhotoPicker extends Screen {
    private final ChappyScreen parent;
    private final List<Integer> slots = new ArrayList<>();
    private int page;
    public PhotoPicker(ChappyScreen parent) { super(Component.literal("送る写真を選ぶ")); this.parent = parent; }
    @Override protected void init() {
        slots.clear();
        if (minecraft.player != null) for (int i = 0; i < minecraft.player.getInventory().getContainerSize(); i++)
            if (PhotoBridge.isPhoto(minecraft.player.getInventory().getItem(i))) slots.add(i);
        page = Math.min(page, Math.max(0, (slots.size() - 1) / 6));
        int left = width / 2 - 130, top = height / 2 - 90;
        for (int i = page * 6; i < Math.min(slots.size(), page * 6 + 6); i++) {
            int slot = slots.get(i), y = top + 25 + (i % 6) * 22;
            String name = minecraft.player.getInventory().getItem(slot).getHoverName().getString();
            addRenderableWidget(Button.builder(Component.literal((slot + 1) + ": " + font.plainSubstrByWidth(name, 210)), b -> {
                parent.selectPhoto(slot); minecraft.setScreen(parent);
            }).bounds(left, y, 260, 20).build());
        }
        addRenderableWidget(Button.builder(Component.literal("前"), b -> { page--; rebuildWidgets(); }).bounds(left, top + 160, 40, 20).build()).active = page > 0;
        addRenderableWidget(Button.builder(Component.literal("次"), b -> { page++; rebuildWidgets(); }).bounds(left + 220, top + 160, 40, 20).build()).active = (page + 1) * 6 < slots.size();
        addRenderableWidget(Button.builder(Component.literal("添付を外す"), b -> { parent.selectPhoto(-1); minecraft.setScreen(parent); }).bounds(left + 45, top + 160, 100, 20).build());
        addRenderableWidget(Button.builder(Component.literal("戻る"), b -> onClose()).bounds(left + 150, top + 160, 65, 20).build());
    }
    public void status(jp.reimagined.chappy.Packets.Status s) { if (parent.getMenu().npcId == s.npcId()) parent.status(s); }
    @Override public void onClose() { minecraft.setScreen(parent); }
    @Override public boolean isPauseScreen() { return false; }
    @Override public void render(GuiGraphics g, int x, int y, float partial) {
        super.render(g, x, y, partial);
        g.drawCenteredString(font, title, width / 2, height / 2 - 90, 0xffffff);
        if (slots.isEmpty()) g.drawCenteredString(font, "現像済みのExposureの写真を持ってきてね", width / 2, height / 2 - 30, 0xffffff);
    }
}
