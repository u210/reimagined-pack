package jp.reimagined.chappy;

import java.util.ArrayList;
import java.util.List;

public final class BookText {
    private BookText() {}
    public static boolean requested(String question) {
        if (question.matches(".*本(?:に|で)(?:しない|しなく|まとめない|まとめなく|なく|はなく).*")) return false;
        return question.matches(".*本(?:に(?:して|まとめて|書いて)|で(?:まとめて|出して|お願い)).*");
    }
    public static List<String> pages(String text) {
        if (text.isBlank() || text.length() > 12000) throw new IllegalArgumentException("Invalid book text");
        // 12 glyphs per line leaves room for vanilla Japanese glyphs; 12 lines fit the book viewport.
        var lines = new ArrayList<String>();
        var line = new StringBuilder();
        int columns = 0;
        for (int cp : text.replace("\r", "").codePoints().toArray()) {
            if (cp == '\n') { lines.add(line.toString()); line.setLength(0); columns = 0; continue; }
            if (Character.isISOControl(cp) || cp == 0x00a7) continue;
            if (columns == 12) { lines.add(line.toString()); line.setLength(0); columns = 0; }
            line.appendCodePoint(cp); columns++;
        }
        if (!line.isEmpty()) lines.add(line.toString());
        var pages = new ArrayList<String>();
        for (int i = 0; i < lines.size(); i += 12) pages.add(String.join("\n", lines.subList(i, Math.min(i + 12, lines.size()))));
        if (pages.isEmpty() || pages.size() > 100) throw new IllegalArgumentException("Book exceeds 100 pages");
        return List.copyOf(pages);
    }
}
