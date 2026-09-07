package jp.reimagined.chappy;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import com.mojang.logging.LogUtils;
import com.mojang.serialization.JsonOps;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.UUID;
import net.minecraft.SharedConstants;
import net.minecraft.core.registries.BuiltInRegistries;
import net.minecraft.server.MinecraftServer;
import net.minecraft.world.item.Item;
import net.minecraft.world.item.crafting.Recipe;
import net.minecraft.world.item.crafting.RecipeHolder;
import net.neoforged.fml.ModList;
import net.neoforged.fml.loading.FMLPaths;

/** Registry-only, read-only snapshot. Never serializes worlds, player inventories, config secrets or logs. */
public final class KnowledgeExport {
    private long generation;
    private String snapshotId;
    private Job job;
    private static final class Job {
        final JsonObject root = new JsonObject();
        final JsonArray items = new JsonArray(), recipes = new JsonArray(), errors = new JsonArray();
        final Iterator<Item> itemIterator = BuiltInRegistries.ITEM.iterator();
        final Iterator<RecipeHolder<?>> recipeIterator;
        final java.util.List<ReferenceExport.Source> referenceSources = ReferenceExport.sources();
        final java.util.List<java.nio.file.Path> configDirs;
        final String id = UUID.randomUUID().toString();
        final long generation;
        Job(MinecraftServer server, long generation) {
            this.generation = generation;
            configDirs = java.util.List.of(FMLPaths.CONFIGDIR.get(), server.getWorldPath(net.minecraft.world.level.storage.LevelResource.ROOT).resolve("serverconfig"));
            recipeIterator = new ArrayList<>(server.getRecipeManager().getRecipes()).iterator();
            root.addProperty("schemaVersion", 1); root.addProperty("snapshotId", id);
            root.addProperty("capturedAt", Instant.now().toString());
            root.addProperty("minecraftVersion", SharedConstants.getCurrentVersion().getName());
            root.addProperty("source", "loaded_server_registries");
            var mods = new JsonArray();
            for (var mod : ModList.get().getMods()) {
                var m = new JsonObject(); m.addProperty("id", mod.getModId()); m.addProperty("name", mod.getDisplayName());
                m.addProperty("version", mod.getVersion().toString()); mods.add(m);
            }
            root.add("mods", mods);
        }
    }
    public String snapshotId() { return snapshotId; }
    public void start(MinecraftServer server) {
        snapshotId = null;
        job = new Job(server, ++generation);
    }
    public void stop() { generation++; job = null; snapshotId = null; }
    public void tick(MinecraftServer server) {
        Job current = job; if (current == null) return;
        // Keep registry accesses on the server thread, spreading the work across ticks.
        long deadline = System.nanoTime() + 3_000_000;
        int count = 0;
        while (count++ < 128 && System.nanoTime() < deadline) {
            if (current.itemIterator.hasNext()) {
                Item item = current.itemIterator.next(); var i = new JsonObject();
                i.addProperty("id", BuiltInRegistries.ITEM.getKey(item).toString());
                i.addProperty("name", item.getDescription().getString()); i.addProperty("translationKey", item.getDescriptionId());
                var tags = new JsonArray();
                BuiltInRegistries.ITEM.wrapAsHolder(item).tags().forEach(t -> tags.add(t.location().toString()));
                i.add("tags", tags); current.items.add(i);
            } else if (current.recipeIterator.hasNext()) {
                RecipeHolder<?> holder = current.recipeIterator.next();
                try {
                    Recipe<?> recipe = holder.value(); var r = new JsonObject();
                    r.addProperty("id", holder.id().toString());
                    var typeId = BuiltInRegistries.RECIPE_TYPE.getKey(recipe.getType());
                    r.addProperty("type", typeId == null ? "unregistered" : typeId.toString());
                    if (typeId == null) r.addProperty("typeUnavailable", true);
                    r.addProperty("special", recipe.isSpecial());
                    var output = recipe.getResultItem(server.registryAccess());
                    if (!output.isEmpty()) {
                        var result = new JsonObject(); result.addProperty("id", BuiltInRegistries.ITEM.getKey(output.getItem()).toString());
                        result.addProperty("count", output.getCount()); r.add("result", result);
                    }
                    // Serialize the loaded recipe object, not an unmodified on-disk recipe JSON.
                    var encoded = Recipe.CODEC.encodeStart(server.registryAccess().createSerializationContext(JsonOps.INSTANCE), recipe).result();
                    if (encoded.isPresent() && encoded.get().toString().length() <= 32768) r.add("data", encoded.get());
                    else r.addProperty("dataUnavailable", true);
                    var ingredients = new JsonArray();
                    for (var ingredient : recipe.getIngredients()) {
                        var input = new JsonObject(); var candidates = new JsonArray();
                        var stacks = ingredient.getItems();
                        for (int k = 0; k < Math.min(stacks.length, 128); k++) candidates.add(BuiltInRegistries.ITEM.getKey(stacks[k].getItem()).toString());
                        input.add("candidates", candidates); input.addProperty("candidateCount", stacks.length);
                        input.addProperty("truncated", stacks.length > 128); ingredients.add(input);
                    }
                    r.add("ingredients", ingredients); current.recipes.add(r);
                } catch (RuntimeException error) {
                    current.errors.add(holder.id().toString()); // Report coverage loss without leaking exception details.
                }
            } else {
                job = null; current.root.add("items", current.items); current.root.add("recipes", current.recipes);
                current.root.add("unreadableRecipes", current.errors);
                Thread.startVirtualThread(() -> {
                    var target = FMLPaths.GAMEDIR.get().resolve("chappy-knowledge.json");
                    var temp = target.resolveSibling("chappy-knowledge-" + current.id + ".tmp");
                    try {
                        ReferenceExport.append(current.root, current.referenceSources, current.configDirs);
                        Files.writeString(temp, current.root.toString(), StandardCharsets.UTF_8);
                        // Publication is serialized with reload/start/stop on the server thread.
                        server.execute(() -> {
                            try {
                                if (generation != current.generation) { Files.deleteIfExists(temp); return; }
                                try { Files.move(temp, target, StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING); }
                                catch (java.nio.file.AtomicMoveNotSupportedException e) { Files.move(temp, target, StandardCopyOption.REPLACE_EXISTING); }
                                snapshotId = current.id;
                                LogUtils.getLogger().info("Chappy knowledge ready: {} items, {} recipes, {} unreadable", current.items.size(), current.recipes.size(), current.errors.size());
                            } catch (Exception e) { LogUtils.getLogger().warn("Chappy knowledge publication failed ({})", e.getClass().getSimpleName()); }
                        });
                    } catch (Exception e) { LogUtils.getLogger().warn("Chappy knowledge export failed ({})", e.getClass().getSimpleName()); }
                });
                return;
            }
        }
    }
}
