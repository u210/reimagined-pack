package jp.reimagined.chappy;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import com.google.gson.JsonParser;
import com.electronwill.nightconfig.core.UnmodifiableConfig;
import com.electronwill.nightconfig.toml.TomlParser;
import java.nio.file.Path;
import java.nio.file.Files;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.ArrayList;
import java.util.zip.ZipFile;
import net.neoforged.fml.ModList;

public final class ReferenceExport {
    public record Source(String id, String version, Path jar) {}
    public static List<Source> sources() {
        var result = new ArrayList<Source>();
        for (var mod : ModList.get().getMods()) if (mod.getOwningFile() != null)
            result.add(new Source(mod.getModId(), mod.getVersion().toString(), mod.getOwningFile().getFile().getFilePath()));
        return result;
    }
    public static void append(JsonObject root, List<Source> sources, List<Path> configDirs) {
        var docs = new JsonArray(); var translations = new JsonObject();
        for (Source source : sources) {
            if (!Files.isRegularFile(source.jar())) continue;
            try (var zip = new ZipFile(source.jar().toFile())) {
                var entries = zip.entries();
                while (entries.hasMoreElements()) {
                    var entry = entries.nextElement(); String path = entry.getName();
                    boolean language = path.matches("assets/[^/]+/lang/ja_jp\\.json");
                    boolean guide = path.matches("(?:assets|data)/[^/]+/patchouli_books/.+\\.json");
                    if ((!language && !guide) || entry.getSize() > 1048576 || entry.isDirectory()) continue;
                    String text;
                    try (var input = zip.getInputStream(entry)) {
                        byte[] bytes = input.readNBytes(1048577); if (bytes.length > 1048576) continue;
                        text = new String(bytes, StandardCharsets.UTF_8);
                    }
                    if (language) {
                        var json = JsonParser.parseString(text).getAsJsonObject();
                        for (var e : json.entrySet()) if (e.getValue().isJsonPrimitive() && e.getValue().getAsJsonPrimitive().isString()
                                && e.getValue().getAsString().length() <= 2000 && translations.size() < 100000) translations.add(e.getKey(), e.getValue());
                        // Mod tooltip/description text is useful even when the mod has no Patchouli book.
                        StringBuilder descriptions = new StringBuilder();
                        for (var e : json.entrySet()) if (e.getKey().matches(".*(?:tooltip|description|ponder|tutorial).*"))
                            descriptions.append(e.getKey()).append(": ").append(e.getValue().getAsString()).append('\n');
                        add(docs, source, path, descriptions.toString(), "bundled_translation_descriptions");
                    } else add(docs, source, path, text, "bundled_guide");
                }
            } catch (Exception ignored) { /* Coverage reports that not every mod bundles a readable guide. */ }
            for (Path dir : configDirs) {
                if (!Files.isDirectory(dir)) continue;
                try (var paths = Files.list(dir)) {
                    for (Path file : paths.filter(p -> p.getFileName().toString().matches(java.util.regex.Pattern.quote(source.id()) + "(?:[-_.].*)?\\.toml")).toList()) {
                        if (Files.isSymbolicLink(file) || Files.size(file) > 262144 || source.id().equals("chappy")) continue;
                        try (var reader = Files.newBufferedReader(file)) {
                            var values = new JsonObject(); numericConfig(new TomlParser().parse(reader), "", values, 0);
                            add(docs, source, dir.getFileName() + "/" + file.getFileName(), values.toString(), "disk_config_numeric_boolean_only_not_verified_effective");
                        }
                    }
                } catch (Exception ignored) {}
            }
        }
        root.add("documents", docs); root.add("translations", translations);
        root.addProperty("documentCoverage", "Mod JAR内のPatchouli説明書・日本語tooltipと、同名設定ファイルの数値/真偽値のみ。説明書は基準仕様、レシピ変更は実レシピを優先。設定はディスク値で実効値未保証。外部Wiki・ソース・文字列設定・独自説明書は未収録。");
    }
    private static void numericConfig(UnmodifiableConfig config, String prefix, JsonObject values, int depth) {
        if (depth > 8) return;
        for (var e : config.entrySet()) {
            String key = prefix + e.getKey();
            if (key.toLowerCase().matches(".*(?:token|secret|password|auth|key|webhook|url|host|port|address|user|player|uuid|seed).*")) continue;
            Object value = e.getValue();
            if (value instanceof UnmodifiableConfig nested) numericConfig(nested, key + ".", values, depth + 1);
            else if (value instanceof Boolean b) values.addProperty(key, b);
            else if (value instanceof Number n) values.addProperty(key, n);
        }
    }
    private static void add(JsonArray docs, Source source, String path, String text, String kind) {
        if (text.isBlank() || text.equals("{}")) return;
        for (int start = 0; start < text.length() && docs.size() < 1024; start += 6000) {
            var d = new JsonObject(); d.addProperty("id", source.id() + ":" + path + "#" + start / 6000);
            d.addProperty("modId", source.id()); d.addProperty("version", source.version());
            d.addProperty("source", path); d.addProperty("kind", kind);
            d.addProperty("text", text.substring(start, Math.min(start + 6000, text.length()))); docs.add(d);
        }
    }
}
