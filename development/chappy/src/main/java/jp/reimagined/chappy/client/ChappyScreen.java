package jp.reimagined.chappy.client;

import jp.reimagined.chappy.ChappyMenu;
import jp.reimagined.chappy.Packets;
import net.minecraft.client.gui.GuiGraphics;
import net.minecraft.client.gui.components.Button;
import net.minecraft.client.gui.components.EditBox;
import net.minecraft.client.gui.components.Tooltip;
import net.minecraft.client.gui.screens.inventory.AbstractContainerScreen;
import net.minecraft.network.chat.Component;
import net.minecraft.world.entity.player.Inventory;
import net.neoforged.neoforge.network.PacketDistributor;

public final class ChappyScreen extends AbstractContainerScreen<ChappyMenu> {
    private EditBox question;
    private Button send;
    private boolean busy;
    private int photoSlot = -1;
    public void selectPhoto(int slot) { photoSlot = slot; }
    public ChappyScreen(ChappyMenu menu, Inventory inventory, Component title) {
        super(menu, inventory, title); imageWidth = 280; imageHeight = 74;
    }
    @Override protected void init() {
        String old = question == null ? "" : question.getValue();
        super.init();
        question = addRenderableWidget(new EditBox(font, leftPos + 12, topPos + 12, 256, 20, Component.literal("質問")));
        question.setMaxLength(1000); question.setValue(old);
        send = addRenderableWidget(Button.builder(Component.literal("送信"), button -> submit())
                .bounds(leftPos + 12, topPos + 42, 124, 20).build());
        send.active = !busy;
        Button photo = addRenderableWidget(Button.builder(Component.literal("写真"), button -> minecraft.setScreen(new PhotoPicker(this)))
                .bounds(leftPos + 144, topPos + 42, 124, 20).build());
        photo.active = !busy;
        photo.setTooltip(Tooltip.create(Component.literal(photoSlot < 0 ? "持ち物から写真を選ぶ" : "写真を選択済み（持ち物の " + (photoSlot + 1) + " 番）")));
        setInitialFocus(question);
    }
    private void submit() {
        if (busy || question.getValue().isBlank()) return;
        PacketDistributor.sendToServer(new Packets.Ask(menu.containerId, question.getValue(), photoSlot));
        busy = true; send.active = false;
    }
    public void status(Packets.Status s) {
        busy = s.state().equals("accepted") || s.state().equals("thinking");
        if (send != null) send.active = !busy;
    }
    @Override public boolean keyPressed(int key, int scan, int modifiers) {
        if (key == 256) return super.keyPressed(key, scan, modifiers);
        if (question.isFocused()) {
            if (key == 257 || key == 335) { submit(); return true; }
            // Do not let inventory hotkeys close the screen while typing.
            return question.keyPressed(key, scan, modifiers) || question.canConsumeInput();
        }
        return super.keyPressed(key, scan, modifiers);
    }
    @Override protected void renderBg(GuiGraphics g, float partial, int mouseX, int mouseY) {
        g.fill(leftPos, topPos, leftPos + imageWidth, topPos + imageHeight, 0xffd6c9ab);
    }
    @Override protected void renderLabels(GuiGraphics g, int x, int y) {}
    @Override public void render(GuiGraphics g, int x, int y, float partial) {
        super.render(g, x, y, partial); renderTooltip(g, x, y);
    }
}
