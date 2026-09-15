// `npx cap sync` regenerates android/app/capacitor.build.gradle and
// android/capacitor-cordova-android-plugins/build.gradle from scratch every time, and every
// @capacitor/* plugin's own node_modules/@capacitor/<name>/android/build.gradle ships the same
// way — all hard-coded to Java 21 source/target compatibility. This machine's stable JDK is 17
// (Gradle 9.3.1's bundled Groovy can't run on Android Studio's newer bundled JBR — see the
// "Unsupported class file major version 69" build failure), so every one of these needs Java 17
// reapplied after `cap sync` or any `npm install` that touches a @capacitor/* package. Run this
// via the `cap:sync` / `cap:build` npm scripts instead of patching by hand each time.
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const targets = [
  'android/app/capacitor.build.gradle',
  'android/capacitor-cordova-android-plugins/build.gradle',
];

const capacitorDir = 'node_modules/@capacitor';
if (existsSync(capacitorDir)) {
  for (const pkg of readdirSync(capacitorDir)) {
    const gradlePath = join(capacitorDir, pkg, 'android', 'build.gradle');
    if (existsSync(gradlePath)) targets.push(gradlePath);
  }
}

let changed = 0;
for (const path of targets) {
  if (!existsSync(path)) continue;
  const before = readFileSync(path, 'utf8');
  const after = before
    .replaceAll('JavaVersion.VERSION_21', 'JavaVersion.VERSION_17')
    // Some plugins (camera, geolocation) also carry a separate Kotlin `jvmToolchain(21)` block,
    // which triggers Gradle toolchain auto-provisioning independent of sourceCompatibility.
    .replaceAll('jvmToolchain(21)', 'jvmToolchain(17)');
  if (after !== before) {
    writeFileSync(path, after);
    changed += 1;
    console.log(`patched ${path}`);
  }
}
console.log(changed ? `Done — ${changed} file(s) patched to Java 17.` : 'Already on Java 17 — nothing to patch.');
