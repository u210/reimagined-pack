import java.nio.file.*;
import java.util.zip.*;
import org.objectweb.asm.*;

/** Retains reimagined-1's log suppression and all MPI packet behavior. */
public final class PatchMpi {
    public static void main(String[] args) throws Exception {
        int[] changed = {0, 0};
        try (ZipFile input = new ZipFile(args[0]);
             ZipOutputStream out = new ZipOutputStream(Files.newOutputStream(Path.of(args[1])))) {
            var entries = input.entries();
            while (entries.hasMoreElements()) {
                var entry = entries.nextElement();
                byte[] bytes = input.getInputStream(entry).readAllBytes();
                if (entry.getName().equals("me/virusnest/mpi/Util.class")) {
                    ClassReader reader = new ClassReader(bytes);
                    ClassWriter writer = new ClassWriter(reader, 0);
                    reader.accept(new ClassVisitor(Opcodes.ASM9, writer) {
                        public MethodVisitor visitMethod(int access, String name, String desc, String sig, String[] exceptions) {
                            MethodVisitor mv = super.visitMethod(access, name, desc, sig, exceptions);
                            if (!name.equals("ResetHiddenPlayerFor")) return mv;
                            return new MethodVisitor(Opcodes.ASM9, mv) {
                                public void visitLdcInsn(Object value) {
                                    if ("entries".equals(value)) {
                                        changed[0]++;
                                        value = Type.getType("[Lnet/minecraft/class_2945$class_2946;");
                                    }
                                    super.visitLdcInsn(value);
                                }
                                public void visitMethodInsn(int opcode, String owner, String name, String desc, boolean itf) {
                                    if (owner.equals("java/lang/Class") && name.equals("getDeclaredField") && desc.equals("(Ljava/lang/String;)Ljava/lang/reflect/Field;")) {
                                        changed[1]++;
                                        super.visitMethodInsn(Opcodes.INVOKESTATIC, "me/virusnest/mpi/reimagined/FieldLookup", "find", "(Ljava/lang/Class;Ljava/lang/Class;)Ljava/lang/reflect/Field;", false);
                                    } else super.visitMethodInsn(opcode, owner, name, desc, itf);
                                }
                            };
                        }
                    }, 0);
                    bytes = writer.toByteArray();
                }
                ZipEntry copy = new ZipEntry(entry.getName());
                copy.setTime(entry.getTime());
                out.putNextEntry(copy); out.write(bytes); out.closeEntry();
            }
            ZipEntry helper = new ZipEntry("me/virusnest/mpi/reimagined/FieldLookup.class");
            helper.setTime(0);
            out.putNextEntry(helper); out.write(Files.readAllBytes(Path.of(args[2]))); out.closeEntry();
        }
        if (changed[0] != 1 || changed[1] != 1) throw new IllegalStateException("Unexpected patch counts: " + java.util.Arrays.toString(changed));
        System.out.println("Patched exactly one reflection field lookup.");
    }
}
