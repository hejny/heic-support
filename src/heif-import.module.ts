import {
    blobToDataUrl,
    centerArts,
    declareModule,
    fitInside,
    measureImageSize,
    patternToRegExp,
    string_mime_type_with_wildcard,
} from '@collboard/modules-sdk';
import { forImmediate } from 'waitasecond';

/*
 !!!
const { promisify } = require('util');
const fs = require('fs');
const convert = require('heic-convert');

(async () => {
  const inputBuffer = await promisify(fs.readFile)('/path/to/my/image.heic');
  const outputBuffer = await convert({
    buffer: inputBuffer, // the HEIC file buffer
    format: 'JPEG',      // output format
    quality: 1           // the jpeg compression quality, between 0 and 1
  });

  await promisify(fs.writeFile)('./result.jpg', outputBuffer);
})();
*/

const mimeTypes: string_mime_type_with_wildcard[] = ['	image/heic', 'image/heif'];

declareModule({
    manifest: {
        name: '@collboard/svg-import',
        supports: {
            fileImport: mimeTypes,
        },
    },
    async setup(systems) {
        const { importSystem, virtualArtVersioningSystem, apiClient, appState, materialArtVersioningSystem } =
            await systems.request(
                'importSystem',
                'virtualArtVersioningSystem',
                'apiClient',
                'appState',
                'materialArtVersioningSystem',
            );

        return importSystem.registerFileSupport({
            priority: 10,
            async processFile({ logger, file, boardPosition, next }) {
                if (!mimeTypes.some((mimeType) => patternToRegExp(mimeType).test(file.type))) {
                    return next();
                }

                let imageSrc = await blobToDataUrl(file);

                const imageScaledSize = fitInside({
                    isUpscaling: false,
                    objectSize: await (await measureImageSize(file)).divide(appState.transform.scale),
                    containerSize: appState.windowSize.divide(appState.transform.scale),
                });

                const imageArt = new ImageSvgArt(imageSrc, 'image');
                imageArt.size = imageScaledSize;
                imageArt.opacity = 0.5;

                logger.info('Imported svg art', imageArt);

                centerArts({ arts: [imageArt], boardPosition });

                // Note: creating virtual art before  real is uploaded and processed
                const imagePreview = virtualArtVersioningSystem.createPrimaryOperation().newArts(imageArt);

                // TODO: Limit here max size of images> if(imageSize.x>this.systems.appState.windowSize*transform)

                imageSrc = await apiClient.fileUpload(file);
                imageArt.src = imageSrc;
                imageArt.opacity = 1;

                const operation = materialArtVersioningSystem.createPrimaryOperation().newArts(imageArt).persist();

                imagePreview.abort();

                // TODO: [🐅] Everytime when importing sth select this new art and do it DRY - via return operation;
                await forImmediate();
                appState.setSelection({ selected: [imageArt] });

                return operation;
            },
        });
    },
});

/**
 * TODO: !!! Add PLUS features
 * TODO: !!! As external module
 * [⚗️]
 */

//================================================================================
// TODO: [⚗️] Proposal of Classical module maker
/*
FileModule.create({
    name: '@collboard/svg-import',
    priority: 10,
}).onFileImport(({ file, boardPosition, next }) => {
    let imageSrc = await blobToDataUrl(file);


    const imageScaledSize = fitInside({
        isUpscaling: false,
        objectSize: await(await measureImageSize(file)).divide(appState.transform.scale),
        containerSize: appState.windowSize.divide(appState.transform.scale),
    });

    const imageArt = new ImageSvgArt(imageSrc, 'image');
    imageArt.size = imageScaledSize;
    imageArt.opacity = 0.5;

    consolex.info('Imported svg art', imageArt);

    centerArts({ arts: [imageArt], boardPosition });

    // Note: creating virtual art before  real is uploaded and processed
    const imagePreview = virtualArtVersioningSystem.createPrimaryOperation().newArts(imageArt);

    // TODO: Limit here max size of images> if(imageSize.x>this.systems.appState.windowSize*transform)

    imageSrc = await apiClient.fileUpload(file);
    imageArt.src = imageSrc;
    imageArt.opacity = 1;

    materialArtVersioningSystem.createPrimaryOperation().newArts(imageArt).persist();

    imagePreview.abort();

    // TODO: [🐅] Everytime when importing sth select this new art and do it DRY
    await forImmediate();
    appState.setSelection({ selected: [imageArt] });
});

*/
