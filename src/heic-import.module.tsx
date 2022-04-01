import {
    blobToDataUrl,
    centerArts,
    declareModule,
    DeletedArt,
    fitInside,
    ImageArt,
    LoaderInline,
    measureImageSize,
    patternToRegExp,
    React,
    string_mime_type_with_wildcard,
} from '@collboard/modules-sdk';
import heic2any from 'heic2any';
import { forImmediate } from 'waitasecond';

const mimeTypes: string_mime_type_with_wildcard[] = ['image/heic', 'image/heif'];

declareModule({
    manifest: {
        name: '@collboard/svg-import',
        supports: {
            fileImport: mimeTypes,
        },
    },
    async setup(systems) {
        const {
            importSystem,
            virtualArtVersioningSystem,
            apiClient,
            appState,
            materialArtVersioningSystem,
            notificationSystem,
        } = await systems.request(
            'importSystem',
            'virtualArtVersioningSystem',
            'apiClient',
            'appState',
            'materialArtVersioningSystem',
            'notificationSystem',
        );

        return importSystem.registerFileSupport({
            priority: 10,
            async processFile({ logger, file: heicFile, boardPosition, next }) {
                if (!mimeTypes.some((mimeType) => patternToRegExp(mimeType).test(heicFile.type))) {
                    return next();
                }

                // Note: creating loading before image is converted
                const preview = virtualArtVersioningSystem
                    .createPrimaryOperation()
                    .newArts(new DeletedArt() /* !!! new LoadingArt('Converting image from heic/heif to jpeg')*/)
                    .persist();

                const notification = notificationSystem.publish({
                    tag: 'heic-conversion',
                    type: 'info',
                    // places: [NotificationPlace.Board],
                    title: { en: 'HEIF/HEIC import' },
                    body: {
                        en: (
                            <LoaderInline
                                alt="Waiting for module from Colldev"
                                canLoadForever
                                icon={'file-image'}
                                animation={'spinning'}
                            >
                                Converting {heicFile.name} to jpeg
                            </LoaderInline>
                        ),
                    },
                });

                // Note: This can take longer time to process; for example 10 seconds for a HEIC file.
                const jpegFile = await heic2any({
                    // @see https://github.com/alexcorvi/heic2any/blob/master/docs/options.md
                    blob: heicFile,
                    toType: 'image/jpeg' /* <- TODO: Let user pick compression and type of conversion */,
                    quality: 0.85,
                });

                logger.info({ heicFile, jpegFile });

                let imageSrc = await blobToDataUrl(jpegFile as Blob);

                // await previewImage(imageSrc);

                const imageScaledSize = fitInside({
                    isUpscaling: false,
                    objectSize: await (await measureImageSize(imageSrc)).divide(appState.transform.scale),
                    containerSize: appState.windowSize.divide(appState.transform.scale),
                });

                const imageArt = new ImageArt(imageSrc, 'image');
                imageArt.size = imageScaledSize;
                imageArt.opacity = 0.5;

                logger.info('Imported art', imageArt);

                centerArts({ arts: [imageArt], boardPosition });

                // Note: creating virtual art of image before real is uploaded
                preview.newArts(imageArt).persist();

                // TODO: Limit here max size of images> if(imageSize.x>this.systems.appState.windowSize*transform)

                imageSrc = await apiClient.fileUpload(jpegFile as Blob);
                imageArt.src = imageSrc;
                imageArt.opacity = 1;

                const operation = materialArtVersioningSystem.createPrimaryOperation().newArts(imageArt).persist();

                preview.abort();
                notification.destroy();

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

// ================================================================================
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
