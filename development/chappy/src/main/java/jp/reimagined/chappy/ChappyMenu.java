package jp.reimagined.chappy;

import net.minecraft.network.RegistryFriendlyByteBuf;
import net.minecraft.world.entity.player.Inventory;
import net.minecraft.world.entity.player.Player;
import net.minecraft.world.inventory.AbstractContainerMenu;
import net.minecraft.world.inventory.ClickType;
import net.minecraft.world.item.ItemStack;

public final class ChappyMenu extends AbstractContainerMenu {
    public final int npcId;
    public ChappyMenu(int id, Inventory inv, RegistryFriendlyByteBuf buf) { this(id, inv, buf.readVarInt()); }
    public ChappyMenu(int id, Inventory inv, int npcId) {
        super(Chappy.MENU.get(), id); this.npcId = npcId;
    }
    @Override public void clicked(int slotId, int button, ClickType type, Player player) {}
    @Override public ItemStack quickMoveStack(Player p, int index) { return ItemStack.EMPTY; }
    @Override public boolean stillValid(Player p) {
        var npc = p.level().getEntity(npcId);
        return npc != null && npc.isAlive() && npc.getTags().contains(Chappy.TAG) && p.distanceToSqr(npc) < 64;
    }
}
