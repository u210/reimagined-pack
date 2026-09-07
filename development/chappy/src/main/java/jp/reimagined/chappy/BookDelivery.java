package jp.reimagined.chappy;

import net.minecraft.core.component.DataComponents;
import net.minecraft.network.chat.Component;
import net.minecraft.server.level.ServerPlayer;
import net.minecraft.server.network.Filterable;
import net.minecraft.world.item.ItemStack;
import net.minecraft.world.item.Items;
import net.minecraft.world.item.component.WrittenBookContent;

public final class BookDelivery {
    private BookDelivery() {}
    public static String give(ServerPlayer player, String text) {
        var book = new ItemStack(Items.WRITTEN_BOOK);
        var pages = BookText.pages(text).stream().map(s -> Filterable.passThrough((Component) Component.literal(s))).toList();
        book.set(DataComponents.WRITTEN_BOOK_CONTENT, new WrittenBookContent(Filterable.passThrough("チャッピーの相談ノート"), "チャッピー", 0, pages, true));
        int slot = player.getInventory().getFreeSlot();
        if (slot >= 0) {
            player.getInventory().setItem(slot, book);
            player.inventoryMenu.broadcastChanges();
            return "本にまとめて持ち物に入れたよ。『チャッピーの相談ノート』を読んでね。";
        }
        player.drop(book, false);
        return "本にまとめたよ。持ち物がいっぱいなので、足元に落としたよ。拾って読んでね。";
    }
}
