import PureImage from 'pureimage';
import { Bitmap } from 'pureimage/src/bitmap.js';
import JPEG from 'jpeg-js';
import fs from 'fs';

async function main() {
    const viewerurl = "https://manga.fod.fujitv.co.jp/viewer/1327595/BT000132759500700701/";

    //Get token and page data
    const bookid = viewerurl.match(/viewer\/(\d+)/)[1];
    const episodeid = viewerurl.match(/viewer\/\d+\/([^/]+)/)[1];

    const licenceurl= `https://manga.fod.fujitv.co.jp/web/books/licenceKey?book_id=${bookid}&episode_id=${episodeid}`;
    const response = await fetch(licenceurl, {
        "headers": {
            "Zk-Web-version": "1.3.2",
        },
    });
    const pageData = await response.json();
    const keys = pageData.pages_data.keys;

    //download and unscramble pages
    for ( let pageindex = 1; pageindex <= pageData.book_data.spine.length; pageindex++) {
        console.log(`Page ${pageindex}/${pageData.book_data.page_count}`);
        let url = pageData.GUARDIAN_SERVER+ '/'+ pageData.book_data.s3_key + pageindex + '.jpg';
        url += '?'+pageData.ADDITIONAL_QUERY_STRING;

        console.log(`Download image : ${url}`);
        const response = await fetch(url);
        const imgdata = await response.arrayBuffer();
        console.log(`Done. Unscrambling.......`);

        const image = await createBitmap(imgdata, response.headers.get('content-type'));
        const options = { fillRectTransparent1x1AfterDrawImage: false, shiftRemainingEdgeDrawingPosition: false };
        const imgfinal = await descramble(image, keys[pageindex-1], options);

        console.log(`Done. Saving.......`);
        PureImage.encodeJPEGToStream(imgfinal, fs.createWriteStream(`${pageindex}.jpg`), 85);

    }

}

///////////////
///MAIN CALL
//////////////

main();

///////////////
///UNSCRAMBLING
//////////////

async function createBitmap(imgdata, ctype) {
    //console.log(ctype);
    if (ctype == 'image/jpeg') {
        return await decodeJPEGFromarray(imgdata);
    } //else if (ctype == 'image/png') {
    //   return PureImage.decodePNGFromStream(res.data);
    // }

}

async function decodeJPEGFromarray(imgdata) {
    let rawImageData = null;
    try {
        rawImageData = JPEG.decode(imgdata, { maxMemoryUsageInMB: 1024 });
    } catch (err) {
        console.log(err);
        return;
    }

    const bitmap = new Bitmap(rawImageData.width, rawImageData.height, {});
    for (let x_axis = 0; x_axis < rawImageData.width; x_axis++) {
        for (let y_axis = 0; y_axis < rawImageData.height; y_axis++) {
            const n = (y_axis * rawImageData.width + x_axis) * 4;
            bitmap.setPixelRGBA_i(x_axis, y_axis,
                rawImageData.data[n + 0],
                rawImageData.data[n + 1],
                rawImageData.data[n + 2],
                rawImageData.data[n + 3]
            );
        }
    }
    return bitmap;
}

async function descramble(img, seed, options) {
    //console.log(img);
    const bitmap = PureImage.make(img.width, img.height, {});
    var o = Math.floor(img.width / 96) * Math.floor(img.height / 128);
    if ('string' == typeof seed) {
        for (var r = new Randomizer(seed), s = [], a = 0; a < o; ++a) s[a] = a;
        s = r.shuffle(s);
    } else {
        if (!Array.isArray(seed)) return null;
        s = seed;
    }
    //console.log(s);

    var ctx = bitmap.getContext('2d');

    /*
    if (
        canva.width = img.width,
        canva.height = img.height,
        options.fillRectTransparent1x1AfterDrawImage &&
        (
            ctx.fillStyle = 'rgba(0,0,0,0)',
            ctx.shadowColor = 'rgba(0, 0, 0, 0.01)',
            ctx.shadowBlur = 0,
            ctx.shadowOffsetY = 2147483648
        ),
        false
        //this.needsPatchForCanvasGapBug()
    ) {
        for (var c = img.naturalWidth % 96, u = 200, h = 0; h < img.height; ) u = Math.min(u, img.height - h),
        ctx.drawImage(
            img,
            img.naturalWidth - c,
            h,
            c - this.patchValueForCanvasGapBug(),
            u,
            img.naturalWidth - c,
            h,
            c,
            u
        ),
        h += u;
        var d = 0;
        switch (options.shiftRemainingEdgeDrawingPosition) {
            case !0:
                d = 1;
                break;
            case 'odd-height':
                d = img.height % 2 == 1 ? 1 : 0;
        }
        for (var f = img.height % 128, p = 200, g = 0; g < img.width - c; ) p = Math.min(p, img.width - g),
        ctx.drawImage(
            img,
            g,
            img.height - f,
            p - this.patchValueForCanvasGapBug(),
            f,
            g,
            Math.max(0, img.height - f - d),
            p,
            f
        ),
        g += p;
    } else
    	*/
    ctx.drawImage(img, 0, 0), options.fillRectTransparent1x1AfterDrawImage && ctx.fillRect(0, 0, 1, 1);

    for (var m = Math.floor(img.width / 96), v = 0, w = s.length; v < w; ++v) {
        var b = + s[v];
        var y = 96 * Math.floor(v % m);
        var x = 128 * Math.floor(v / m);
        var S = Math.round(96 * Math.floor(b % m));
        b = Math.round(128 * Math.floor(b / m));
        ctx.drawImage(img, y, x, 96, 128, S, b, 96, 128);
        options.fillRectTransparent1x1AfterDrawImage && ctx.fillRect(0, 0, 1, 1);

    }
    return bitmap;

}

const Randomizer = function () {
    var e;
    function t(e) {
        this.next = this._str_to_int(e);
    }
    t.prototype.rand = function (e) {
        return null != e ? (
            e = e + 1,
            Math.floor(this._next_int() / (Math.floor(t.RAND_MAX / e) + 1))
        ) : this._next_int();
    },
    t.prototype.shuffle = function (e) {
        for (
            var t,
                n,
                i,
                o = [].concat(e),
                r = n = 0,
                s = o.length;
            0 <= s ? n < s : s < n;
            r = 0 <= s ? ++n : --n
        ) i = o[t = this.rand(o.length - 1)],
        o[t] = o[r],
        o[r] = i;
        return o;
    },
    t.PARAM_A = 1103515245,
    t.PARAM_B = 12345,
    t.RAND_MAX = 32767,
    t.prototype._next_int = function () {
        return this.next = (this.next * t.PARAM_A + t.PARAM_B) % (t.RAND_MAX + 1),
        this.next;
    },
    t.prototype._str_to_int = function (e) {
        var t,
            n,
            i,
            o = 0;
        if (null != e) for (t = e.split(''); 0 < t.length; ) i = t.shift(),
        n = t.shift(),
        o += i.charCodeAt(i = 0) << 8 | (i = n ? n.charCodeAt(0) : i);
        return o;
    },
    e = t;
    return e;
}();
