import me.virusnest.mpi.reimagined.FieldLookup;

public final class TestFieldLookup {
    static class Item {}
    static class Yarn { private Item[] entries = {new Item()}; }
    static class Mojmap { private Item[] itemsById = {new Item()}; private String[] noise; static Item[] ignored; }
    static class Ambiguous { Item[] first; Item[] second; }
    static class Missing { String[] entries; }
    public static void main(String[] args) throws Exception {
        for (Object owner : new Object[]{new Yarn(), new Mojmap()}) {
            var field = FieldLookup.find(owner.getClass(), Item[].class);
            field.setAccessible(true);
            if (((Item[]) field.get(owner)).length != 1) throw new AssertionError();
        }
        for (Class<?> owner : new Class<?>[]{Ambiguous.class, Missing.class}) {
            try { FieldLookup.find(owner, Item[].class); throw new AssertionError("Expected failure"); }
            catch (NoSuchFieldException expected) { }
        }
        System.out.println("PASS: Yarn/Mojmap names, private data, static/unrelated fields, missing/ambiguous rejection");
    }
}
