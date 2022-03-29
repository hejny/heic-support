import {
  blobToDataUrl,
  centerArts,
  declareModule,
  fitInside,
  ImageArt,
  measureImageSize
} from '@collboard/modules-sdk';
import { jsPDF } from "jspdf";
import { forEver, forImmediate } from 'waitasecond';

declareModule({
    manifest: {
        name: 'ImagesImport',
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

        // Note: For lot of systems we are using this makeWhatever helpers. I am trying one system - ImportSystem without make helper to modules just to use this systems methods directly.
        return importSystem.registerFileSupport({
            priority: 0,
            mimeType: 'application/pdf',
            async processFile({ file, boardPosition }) {


              const pdf = new jsPDF();

              pdf.

              // TODO: !!! Implement conversion of pdf to image

              // Phases:
              // 1) Upload image to server
              // 2) Upload PDF to server and show it in PdfArt


              await forEver();


              //-----------------------------

                let imageSrc = await blobToDataUrl(file);
                const imageScaledSize = fitInside({
                    isUpscaling: false,
                    objectSize: await (await measureImageSize(file)).divide(appState.transform.scale),
                    containerSize: appState.windowSize.divide(appState.transform.scale),
                });

                const imageArt = new ImageArt(imageSrc, 'image');
                imageArt.size = imageScaledSize;
                imageArt.opacity = 0.5;

                console.info('Imported art', imageArt);

                centerArts({ arts: [imageArt], boardPosition });

                // Note: creating virtual art before  real is uploaded and processed
                const imagePreview = virtualArtVersioningSystem.createPrimaryOperation().newArts(imageArt);

                // TODO: Limit here max size of images> if(imageSize.x>this.systems.appState.windowSize*transform)

                imageSrc = await apiClient.fileUpload(file);
                imageArt.src = imageSrc;
                imageArt.opacity = 1;

                materialArtVersioningSystem.createPrimaryOperation().newArts(imageArt).persist();

                imagePreview.abort();

                // TODO: Everytime when importing sth select this new art and do it DRY
                await forImmediate();
                appState.setSelection({ selected: [imageArt] });
            },
        });
    },
});
