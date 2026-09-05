import java.nio.file.*;
import java.util.zip.*;
import org.objectweb.asm.*;

/** Server workaround: honor sort_recipes=false before building creative tabs. */
public final class PatchSawmill {
    static final String TARGET = "net/mehvahdjukaar/sawmill/RecipeSorter.class";
    public static void main(String[] args) throws Exception {
        int[] patched = {0};
        try (ZipFile input = new ZipFile(args[0]);
             ZipOutputStream output = new ZipOutputStream(Files.newOutputStream(Path.of(args[1])))) {
            var entries = input.entries();
            while (entries.hasMoreElements()) {
                var entry = entries.nextElement();
                byte[] bytes = input.getInputStream(entry).readAllBytes();
                if (entry.getName().equals(TARGET)) {
                    ClassReader reader = new ClassReader(bytes);
                    ClassWriter writer = new ClassWriter(reader, ClassWriter.COMPUTE_MAXS);
                    reader.accept(new ClassVisitor(Opcodes.ASM9, writer) {
                        @Override public MethodVisitor visitMethod(int access, String name, String desc, String sig, String[] exceptions) {
                            MethodVisitor mv = super.visitMethod(access, name, desc, sig, exceptions);
                            if (!name.equals("refreshIfNeeded") || !desc.equals("(Lnet/minecraft/core/RegistryAccess;)V")) return mv;
                            patched[0]++;
                            return new MethodVisitor(Opcodes.ASM9, mv) {
                                @Override public void visitCode() {
                                    super.visitCode();
                                    mv.visitFieldInsn(Opcodes.GETSTATIC, "net/mehvahdjukaar/sawmill/CommonConfigs", "SORT_RECIPES", "Ljava/util/function/Supplier;");
                                    mv.visitMethodInsn(Opcodes.INVOKEINTERFACE, "java/util/function/Supplier", "get", "()Ljava/lang/Object;", true);
                                    mv.visitTypeInsn(Opcodes.CHECKCAST, "java/lang/Boolean");
                                    mv.visitMethodInsn(Opcodes.INVOKEVIRTUAL, "java/lang/Boolean", "booleanValue", "()Z", false);
                                    Label enabled = new Label();
                                    mv.visitJumpInsn(Opcodes.IFNE, enabled);
                                    mv.visitInsn(Opcodes.RETURN);
                                    mv.visitLabel(enabled);
                                    mv.visitFrame(Opcodes.F_SAME, 0, null, 0, null);
                                }
                            };
                        }
                    }, 0);
                    bytes = writer.toByteArray();
                }
                ZipEntry copy = new ZipEntry(entry.getName());
                copy.setTime(entry.getTime());
                output.putNextEntry(copy);
                output.write(bytes);
                output.closeEntry();
            }
        }
        if (patched[0] != 1) throw new IllegalStateException("Expected exactly one method; found " + patched[0]);
        System.out.println("Patched refreshIfNeeded: sort_recipes=false now returns before creative tab initialization.");
    }
}
