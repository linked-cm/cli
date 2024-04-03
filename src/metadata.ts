import {NamedNode} from 'lincd/models';
import {GetEnvVars} from 'env-cmd';
import path from 'path';
import fs from 'fs-extra';
import {createNameSpace} from 'lincd/utils/NameSpace';
import {Prefix} from 'lincd/utils/Prefix';
import {getPackageJSON} from './utils';
import {warn} from './cli-methods';
import {JSONLDWriter} from 'lincd-jsonld/lib/utils/JSONLDWriter';

function getLocalPackagePaths() {
  let packagePaths = [];

  //add the APP package itself
  let appPackagePath = process.cwd();
  let appLincdPackagePath = path.join(
    appPackagePath,
    'frontend',
    'src',
    'package.ts',
  );
  if (fs.existsSync(appPackagePath)) {
    let packageJSON = getPackageJSON(appPackagePath);

    packagePaths.push([
      packageJSON.name,
      appPackagePath,
      appLincdPackagePath,
      true,
    ]);
  } else {
    console.log('Not a LINCD app');
  }

  //NOTE: we could also switch to checking 'workspaces'?
  let packagesFolder = path.join(process.cwd(), 'packages');
  if (fs.existsSync(packagesFolder)) {
    let localPackages = fs.readdirSync(packagesFolder);
    localPackages.forEach((packageFolderName) => {
      packagePaths.push([
        packageFolderName,
        path.join(packagesFolder, packageFolderName),
        path.join(packagesFolder, packageFolderName, 'lib', 'package.js'),
      ]);
    });
  }
  return packagePaths;
}

export const buildMetadata = async (): Promise<string[]> => {
  // require('@babel/register')({extensions: ['js', '.ts', '.tsx']});

  //NOTE: we can not rely on the LincdWebApp shape from lincd-server here, because that would make the initial build of all modules a lot trickier
  //see, CLI needs to be built as one of the first things in order to build other things. So it cannot rely on lincd-server, which relies on 10 other packages
  let app: NamedNode;

  //set the URL of the app as the URI of its node
  let envVars: any = await GetEnvVars({
    envFile: {
      filePath: '.env-cmdrc.json',
    },
  });
  if (
    envVars[process.env.NODE_ENV] &&
    envVars[process.env.NODE_ENV].SITE_ROOT
  ) {
    //get the site root of the current environment
    app = NamedNode.getOrCreate(envVars[process.env.NODE_ENV].SITE_ROOT);
  } else {
    warn(
      'Cannot find environment variable SITE_ROOT. Make sure SITE_ROOT is set (likely in .env-cmdrc.json) for the current environment: ' +
        process.env.NODE_ENV,
    );
    app = NamedNode.create();
  }

  let updatedPaths = [];
  var localPackagePaths = getLocalPackagePaths();

  //prepare output path
  let metadataFolder = path.join(process.cwd(), 'data', 'metadata');
  await fs.ensureDir(metadataFolder); //{recursive:true} but not needed with fs-extra

  for (const [
    packageCodeName,
    packagePath,
    lincdPackagePath,
    isAppPackage,
  ] of localPackagePaths) {
    let errors = false;
    //TODO: check if this resolves, if not, skip it (for initial setup)
    import('lincd-modules/lib/scripts/package-metadata.js').then(
      async (script) => {
        await script
          .getPackageMetadata(packagePath, lincdPackagePath)
          .then(async (response) => {
            if (response.errors.length > 0) {
              // console.log(JSON.stringify(response));
              warn(
                'Error processing ' +
                  packagePath +
                  ':\n' +
                  response.errors.join('\n'),
              );
              // throw response
              errors = true;
            } else {
              if (!response.packageUri) {
                console.warn(
                  'No package URI from meta data. Not building meta data for this package',
                );
                return;
              }
              let pkgNode = NamedNode.getOrCreate(response.packageUri);
              //connect the packages to the app
              let lincdApp = createNameSpace('http://lincd.org/ont/lincd-app/');
              Prefix.add('lincdApp', 'http://lincd.org/ont/lincd-app/');
              if (isAppPackage) {
                //Note: this needs to match with LincdWebApp.ownPackage accessor;
                app.overwrite(lincdApp('ownPackage'), pkgNode);
              } else {
                //Note: this needs to match with LincdWebApp.packages accessor;
                app.set(lincdApp('maintainsPackage'), pkgNode);
              }

              //write this graph to a jsonld file
              let packageMetaData = JSON.stringify(response.result, null, 2);
              let metadataFile = path.join(
                metadataFolder,
                packageCodeName + '.json',
              );
              await fs.writeFile(metadataFile, packageMetaData).then(() => {
                updatedPaths.push(metadataFile);
              });
            }
          });
      },
    );

    //enable this when testing if you don't want to continue with building other metadata when an errors occur
    // if (errors) break;
  }

  let packageMetaData = await JSONLDWriter.stringify(
    app as any,
    process.env.NODE_ENV === 'development',
  );
  let metadataFile = path.join(metadataFolder, '_app.json');
  await fs.writeFile(metadataFile, packageMetaData).then(() => {
    updatedPaths.push(metadataFile);
  });

  return updatedPaths;
};
