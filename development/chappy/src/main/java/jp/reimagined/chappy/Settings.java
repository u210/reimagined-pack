package jp.reimagined.chappy;

import net.neoforged.neoforge.common.ModConfigSpec;

public final class Settings {
    public static final ModConfigSpec SPEC;
    public static final ModConfigSpec.ConfigValue<String> GATEWAY;
    public static final ModConfigSpec.ConfigValue<String> TOKEN;
    public static final ModConfigSpec.IntValue MAX_GUIDES;
    static {
        var b = new ModConfigSpec.Builder();
        GATEWAY = b.comment("Local development gateway. Never point this at a public unauthenticated endpoint.")
                .define("gatewayUrl", "http://127.0.0.1:18765");
        TOKEN = b.comment("Gateway bearer token. Server-side only; never sent to players.")
                .define("gatewayToken", "");
        MAX_GUIDES = b.defineInRange("maxGuides", 1, 1, 16);
        SPEC = b.build();
    }
}
