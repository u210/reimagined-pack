package me.virusnest.mpi.reimagined;

import java.lang.reflect.Field;
import java.lang.reflect.Modifier;

/** Field names are not remapped inside reflection strings by Connector. */
public final class FieldLookup {
    public static Field find(Class<?> owner, Class<?> type) throws NoSuchFieldException {
        Field match = null;
        for (Field field : owner.getDeclaredFields()) {
            if (!Modifier.isStatic(field.getModifiers()) && field.getType() == type) {
                if (match != null) throw new NoSuchFieldException("Ambiguous " + type + " in " + owner);
                match = field;
            }
        }
        if (match == null) throw new NoSuchFieldException("Missing " + type + " in " + owner);
        return match;
    }
}
