package jp.reimagined.chappy;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import net.minecraft.core.HolderLookup;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.nbt.ListTag;
import net.minecraft.nbt.Tag;
import net.minecraft.server.MinecraftServer;
import net.minecraft.world.entity.Entity;
import net.minecraft.world.level.saveddata.SavedData;

public final class GuideData extends SavedData {
    public record Entry(UUID id, String dimension, int x, int y, int z) {}
    public final List<Entry> entries = new ArrayList<>();
    public static GuideData get(MinecraftServer server) {
        return server.overworld().getDataStorage().computeIfAbsent(new Factory<>(GuideData::new, GuideData::load), "chappy_guides");
    }
    public void add(Entity e) {
        entries.add(new Entry(e.getUUID(), e.level().dimension().location().toString(), e.getBlockX(), e.getBlockY(), e.getBlockZ()));
        setDirty();
    }
    private static GuideData load(CompoundTag tag, HolderLookup.Provider registries) {
        var result = new GuideData();
        for (Tag value : tag.getList("guides", Tag.TAG_COMPOUND)) {
            var t = (CompoundTag) value;
            result.entries.add(new Entry(t.getUUID("id"), t.getString("dimension"), t.getInt("x"), t.getInt("y"), t.getInt("z")));
        }
        return result;
    }
    @Override public CompoundTag save(CompoundTag tag, HolderLookup.Provider registries) {
        ListTag list = new ListTag();
        for (Entry e : entries) {
            var t = new CompoundTag(); t.putUUID("id", e.id()); t.putString("dimension", e.dimension());
            t.putInt("x", e.x()); t.putInt("y", e.y()); t.putInt("z", e.z()); list.add(t);
        }
        tag.put("guides", list); return tag;
    }
}
