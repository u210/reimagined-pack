package jp.reimagined.chappy;

public final class BookTextCheck {
    private static void check(boolean value) { if (!value) throw new AssertionError(); }
    public static void main(String[] args) {
        for (String s : new String[]{"本にして", "これを本でまとめて", "作業台の作り方を本にまとめて"}) check(BookText.requested(s));
        for (String s : new String[]{"本の作り方は？", "本棚はどう作るの？", "本にしないで", "本にしなくていい", "本ではなくチャットでお願い"}) check(!BookText.requested(s));
        for (String s : new String[]{"あいうえお".repeat(2000), "abcdef😀".repeat(1000), "短いメモ", "材料\n木材4個\n\n手順\n2×2に配置"}) {
            var pages = BookText.pages(s);
            check(pages.size() <= 100);
            check(String.join("", pages).replace("\n", "").equals(s.replace("\n", "")));
            for (String page : pages) {
                check(page.split("\n", -1).length <= 12);
                for (String line : page.split("\n", -1)) check(line.codePointCount(0, line.length()) <= 12);
            }
        }
        try { BookText.pages("a\n".repeat(2000)); throw new AssertionError(); } catch (IllegalArgumentException expected) {}
        try { BookText.pages("x".repeat(12001)); throw new AssertionError(); } catch (IllegalArgumentException expected) {}
        System.out.println("Book intent, Unicode pagination, page bounds and overflow checks passed");
    }
}
