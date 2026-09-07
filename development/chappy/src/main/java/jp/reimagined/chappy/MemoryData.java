package jp.reimagined.chappy;

import com.google.gson.JsonArray;
import com.google.gson.JsonElement;
import java.util.HashMap;
import java.util.List;
import java.util.ArrayList;
import java.util.Map;
import java.util.UUID;
import net.minecraft.core.HolderLookup;
import net.minecraft.nbt.CompoundTag;
import net.minecraft.nbt.ListTag;
import net.minecraft.nbt.StringTag;
import net.minecraft.nbt.Tag;
import net.minecraft.server.MinecraftServer;
import net.minecraft.world.level.saveddata.SavedData;

public final class MemoryData extends SavedData {
    private final Map<UUID, List<String>> notes = new HashMap<>();
    public static MemoryData get(MinecraftServer server) {
        return server.overworld().getDataStorage().computeIfAbsent(new Factory<>(MemoryData::new, MemoryData::load), "chappy_memory");
    }
    public JsonArray read(UUID id) { var a = new JsonArray(); notes.getOrDefault(id, List.of()).forEach(a::add); return a; }
    public void forget(UUID id) { notes.remove(id); setDirty(); }
    public void replace(UUID id, JsonArray array) {
        if (array.size() > 20) throw new IllegalArgumentException("Too many memories");
        var list = new ArrayList<String>();
        for (JsonElement entry : array) {
            if (!entry.isJsonPrimitive() || !entry.getAsJsonPrimitive().isString()) throw new IllegalArgumentException("Invalid memory");
            String s = entry.getAsString();
            if (s.isBlank() || s.length() > 300 || s.codePoints().anyMatch(Character::isISOControl)) throw new IllegalArgumentException("Invalid memory");
            list.add(s);
        }
        if (!list.equals(notes.get(id))) { notes.put(id, List.copyOf(list)); setDirty(); }
    }
    static MemoryData load(CompoundTag tag, HolderLookup.Provider registries) {
        var data = new MemoryData();
        for (Tag entry : tag.getList("players", Tag.TAG_COMPOUND)) {
            var t = (CompoundTag) entry; var a = new JsonArray();
            for (Tag note : t.getList("notes", Tag.TAG_STRING)) a.add(note.getAsString());
            try { data.replace(t.getUUID("id"), a); } catch (IllegalArgumentException ignored) {}
        }
        return data;
    }
    @Override public CompoundTag save(CompoundTag tag, HolderLookup.Provider registries) {
        var players = new ListTag();
        notes.forEach((id, values) -> { var t = new CompoundTag(); t.putUUID("id", id); var list = new ListTag();
            values.forEach(s -> list.add(StringTag.valueOf(s))); t.put("notes", list); players.add(t); });
        tag.put("players", players); return tag;
    }
}
