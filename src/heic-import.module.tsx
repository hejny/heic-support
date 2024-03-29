import {
  blobToDataurl,
  centerArts,
  declareModule,
  fitInside,
  ImageArt,
  measureImageSize,
  patternToRegExp,
  string_mime_type_with_wildcard,
  windowSize
} from '@collboard/modules-sdk';
import heic2any from 'heic2any';
import { contributors, description, license, repository, version } from '../package.json';

const mimeTypes: string_mime_type_with_wildcard[] = ['image/heic', 'image/heif'];

declareModule({
    manifest: {
        name: '@collboard/heic-import',
        contributors,
        description,
        license,
        repository,
        version,
        flags: {
            isHidden: true /* <- TODO: (File) support modules should be always hidden*/,
        },
        supports: {
            fileImport: mimeTypes,
        },
    },
    async setup(systems) {
        const {
            importSystem,
            virtualArtVersioningSystem,
            usercontentSystem,
            appState,
            materialArtVersioningSystem,
            notificationSystem,
        } = await systems.request(
            'importSystem',
            'virtualArtVersioningSystem',
            'usercontentSystem',
            'appState',
            'materialArtVersioningSystem',
            'notificationSystem',
        );

        return importSystem.registerFileSupport({
            priority: 10,
            async importFile({ logger, file: heicFile, boardPosition, next, willCommitArts, previewOperation }) {
                if (!mimeTypes.some((mimeType) => patternToRegExp(mimeType).test(heicFile.type))) {
                    return next();
                }

                willCommitArts();

                // Note: This can take longer time to process; for example 10 seconds for a HEIC file.
                const jpegFile = await heic2any({
                    // @see https://github.com/alexcorvi/heic2any/blob/master/docs/options.md
                    blob: heicFile,
                    toType: 'image/jpeg' /* <- TODO: Let user pick compression and type of conversion */,
                    quality: 0.85,
                });

                logger.info({ heicFile, jpegFile });

                let imageSrc = await blobToDataurl(jpegFile as Blob);

                // await previewImage(imageSrc);

                const imageScaledSize = fitInside({
                    isUpscaling: false,
                    objectSize: await (await measureImageSize(imageSrc)).divide(appState.transform.value.scale),
                    containerSize: windowSize.value.divide(appState.transform.value.scale),
                });

                const imageArt = new ImageArt(imageSrc, 'image');
                imageArt.size = imageScaledSize;
                imageArt.opacity = 0.5;

                logger.info('Imported art', imageArt);

                centerArts({ arts: [imageArt], boardPosition });

                previewOperation.update(imageArt);

                // TODO: Limit here max size of images> if(imageSize.x>this.systems.appState.windowSize*transform)

                imageSrc = (await usercontentSystem.upload(jpegFile as Blob)).href;
                imageArt.src = imageSrc;
                imageArt.opacity = 1;

                return imageArt;
            },
        });
    },
});
