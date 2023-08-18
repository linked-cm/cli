fs = require('fs');

let file = 'android/capacitor-cordova-android-plugins/build.gradle';

//check if file exists
if (!fs.existsSync(file)) {
  console.log('File does not exist.', file);
} else {
  //read contents of "android/capacitor-cordova-android-plugins/build.gradle"
  let contents = fs.readFileSync(file, 'utf8');

  if (!contents.includes('namespace')) {
    //insert text on line 19
    contents = contents.replace(
      /android \{/,
      `android {
    namespace 'capacitor.android.plugins'`,
    );

    //write back to file
    fs.writeFileSync(file, contents, 'utf8');

    console.log('Added namespace to ' + file);
  } else {
    console.log('Namespace already present in ' + file);
  }
}

let file2 = 'ios/App/Pods/Pods.xcodeproj/project.pbxproj';
if (!fs.existsSync(file2)) {
  console.log('File does not exist.', file2);
} else {
  let contents2 = fs.readFileSync(file2, 'utf8');
  if (contents2.includes('IPHONEOS_DEPLOYMENT_TARGET = 12.0')) {
    contents2 = contents2.replace(/IPHONEOS_DEPLOYMENT_TARGET \= 12\.0/g, `IPHONEOS_DEPLOYMENT_TARGET = 13.0`);
    fs.writeFileSync(file2, contents2, 'utf8');
    console.log('Fixed IOS target version for codetrix google oauth plugin');
  } else {
    console.log("Didn't need to fix IOS target version");
  }
}
