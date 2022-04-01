import { string_url_image } from '@collboard/modules-sdk';
import { forValueDefined } from 'waitasecond';

export async function previewImage(imgSrc: string_url_image) {
    const tab = await forValueDefined(() => window.open('', 'image-preview', 'width=800,height=600'))!;
    tab.document.body.innerHTML = `<img src="${imgSrc}" style="width: 100%" />`;
}
