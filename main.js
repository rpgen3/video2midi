(async () => {
    const {importAll, getScript, importAllSettled} = await import(`https://rpgen3.github.io/mylib/export/import.mjs`);
    await getScript('https://code.jquery.com/jquery-3.3.1.min.js');
    const {$} = window;
    const html = $('body').empty().css({
        'text-align': 'center',
        padding: '1em',
        'user-select': 'none'
    });
    const head = $('<header>').appendTo(html),
          main = $('<main>').appendTo(html),
          foot = $('<footer>').appendTo(html);
    $('<h1>').appendTo(head).text('video2midi');
    $('<h2>').appendTo(head).text('動画をmidiに変換します。');
    const rpgen3 = await importAll([
        'input',
        'css',
        'url',
        'hankaku',
        'sample',
        'util'
    ].map(v => `https://rpgen3.github.io/mylib/export/${v}.mjs`));
    const rpgen4 = await importAll([
        'piano'
    ].map(v => `https://rpgen3.github.io/midi/mjs/${v}.mjs`));
    Promise.all([
        [
            'container',
            'tab',
            'img'
        ].map(v => `https://rpgen3.github.io/spatialFilter/css/${v}.css`),
        [
            'video'
        ].map(v => `https://rpgen3.github.io/video2midi/css/${v}.css`)
    ].flat().map(rpgen3.addCSS));
    const video = new class {
        constructor(){
            const html = $('<div>').appendTo(main).addClass('container');
            $('<h3>').appendTo(html).text('処理する動画の設定');
            this.input = $('<dl>').appendTo(html);
            this.output = $('<div>').appendTo(html);
            this.video = null;
            this.time = $('<div>').appendTo(html);
        }
        get w(){
            return this.video.videoWidth;
        }
        get h(){
            return this.video.videoHeight;
        }
        async load(url){
            $(this.video = await rpgen3.loadSrc('video', url)).appendTo(this.output.empty());
            const {video} = this;
            video.controls = true;
            const {cv, ctx} = rpgen3.makeCanvas(this.w, this.h);
            rpgen3.addBtn($('<div>').appendTo(this.output), '現在のシーンを保存', () => {
                ctx.drawImage(video, 0, 0);
                $('<a>').attr({
                    href: cv.toDataURL(),
                    download: 'video2midi.png'
                }).get(0).click();
            });
        }
        async seek(x){
            const {video} = this;
            return new Promise(resolve => {
                video.addEventListener('seeked', resolve, {once: true});
                video.currentTime = x;
            });
        }
    };
    { // 動画入力
        const {input} = video;
        $('<dt>').appendTo(input).text('ファイル入力');
        $('<input>').appendTo($('<dd>').appendTo(input)).prop({
            type: 'file'
        }).on('change', ({target}) => {
            const {files} = target;
            if(files.length) video.load(URL.createObjectURL(files[0]));
        });
    }
    const time = new class {
        constructor(){
            const html = video.time;
            $('<h3>').appendTo(html).text('採譜する動画の時間を入力');
            const input = $('<dl>').appendTo(html);
            this.start = rpgen3.addInputStr(input, {
                label: '開始時間[sec]',
                save: true
            });
            this.end = rpgen3.addInputStr(input, {
                label: '終了時間[sec]',
                save: true
            });
        }
        get any(){
            const [start, end] = [
                this.start,
                this.end
            ].map(v => v()).map(rpgen3.toHan).map(v => v.match(/[0-9]+/)?.[0]).map(Number);
            return {start, end};
        }
    };
    const image = new class {
        constructor(){
            const html = $('<div>').appendTo(main).addClass('container');
            $('<h3>').appendTo(html).text('二値化した鍵盤の画像の設定');
            this.input = $('<dl>').appendTo(html);
            this.output = $('<div>').appendTo(html);
            this.img = null;
            this.bothEnd = $('<div>').appendTo(html);
        }
        get w(){
            return this.img.naturalWidth;
        }
        get h(){
            return this.img.naturalHeight;
        }
        async load(url){
            $(this.img = await rpgen3.loadSrc('img', url)).appendTo(this.output.empty());
        }
    };
    { // 画像入力
        const {input} = image;
        $('<dt>').appendTo(input).text('ファイル入力');
        $('<input>').appendTo($('<dd>').appendTo(input)).prop({
            type: 'file'
        }).on('change', ({target}) => {
            const {files} = target;
            if(files.length) image.load(URL.createObjectURL(files[0]));
        });
    }
    const bothEnd = new class {
        constructor(){
            const html = image.bothEnd;
            $('<h3>').appendTo(html).text('鍵盤の座標を入力');
            const input = $('<dl>').appendTo(html);
            this.way = rpgen3.addSelect(input, {
                label: '鍵盤の並ぶ向き',
                save: true,
                list: {
                    '水平': true,
                    '垂直': false
                }
            });
            this.horizon = rpgen3.addInputStr(input, {
                label: '鍵盤の並ぶ位置',
                save: true
            });
            this.start = rpgen3.addInputStr(input, {
                label: '始端の中心位置',
                save: true
            });
            this.end = rpgen3.addInputStr(input, {
                label: '終端の中心位置',
                save: true
            });
        }
        get any(){
            const [start, end, horizon] = [
                this.start,
                this.end,
                this.horizon
            ].map(v => v()).map(rpgen3.toHan).map(v => v.match(/[0-9]+/)?.[0]).map(Number);
            return {start, end, horizon};
        }
    };
    rpgen3.addBtn(main, '採譜開始', () => getMidi());
    const msg = new class {
        constructor(){
            this.html = $('<div>').appendTo(main);
        }
        async print(str){
            this.html.text(str);
            await rpgen3.sleep(0);
        }
    };
    class Note {
        constructor(index, flag, time){
            this.index = index;
            this.flag = flag;
            this.time = time;
        }
    }
    let g_midi = [];
    const getMidi = async () => {
        await msg.print('鍵盤の座標を取得');
        const mid = calcMid(),
              times = time.any;
        await video.seek(times.start);
        const {w, h} = video,
              {ctx} = rpgen3.makeCanvas(w, h);
        const f = () => {
            ctx.drawImage(video.video, 0, 0);
            return ctx.getImageData(0, 0, w, h).data;
        };
        const {start, end, horizon} = bothEnd.any,
              d = f(),
              _mid = [];
        for(const v of mid) {
            const i = rpgen3.toI(w, v, horizon) << 2;
            _mid.push(d.subarray(i, i + 3));
        }
        const isNoteOn = [...mid.slice().fill(false)],
              midi = [];
        for(let t = times.start + 1; t <= times.end; t++) {
            await video.seek(t);
            await msg.print(`${times.start}/${times.end}`);
            const d = f();
            for(const [i, v] of mid.entries()) {
                const _i = rpgen3.toI(w, v, horizon) << 2,
                      [r, g, b] = d.subarray(_i, _i + 3),
                      [R, G, B] = _mid[i];
                if(r === R && g === G && b === B) { // 入力無し
                    if(isNoteOn[i]) {
                        isNoteOn[i] = false; // ON → OFF
                        midi.push(new Note(i, false, t));
                    }
                    continue;
                }
                if(isNoteOn[i]) continue;
                isNoteOn[i] = true; // OFF → ON
                midi.push(new Note(i, true, t));
            }
        }
        g_midi = midi;
        await msg.print('採譜完了');
    };
    const calcMid = () => {
        const {w, h} = image,
              {cv, ctx} = rpgen3.makeCanvas(w, h);
        ctx.drawImage(image.img, 0, 0);
        const {data} = ctx.getImageData(0, 0, w, h),
              way = bothEnd.way(),
              {start, end, horizon} = bothEnd.any,
              edge = [];
        let isEdge = false;
        const toI = x => rpgen3.toI(w, ...(way ? [x, horizon] : [horizon, x])),
              diff = end - start,
              minus = diff > 0 ? 1 : -1;
        for(const i of Array(diff).keys()) {
            if(data[toI[toI(start + i * minus)]]) { // white
                if(!isEdge) continue;
                isEdge = false;
            }
            else { // black
                if(isEdge) continue;
                isEdge = true;
                edge.push(i);
            }
        }
        const mid = [];
        for(let i = 1; i < edge.length; i++) mid.push(edge[i] - edge[i - 1] >> 1);
        mid.unshift(start);
        mid.push(end);
        return mid;
    };
    rpgen3.addBtn(main, 'MIDIを出力', () => outputMidi());
    const outputMidi = () => {
        const arr = [];
        HeaderChunks(arr);
        for(const heap of heaps) TrackChunks(arr, heap);
        return URL.createObjectURL(new Blob([new Uint8Array(arr).buffer], {type: 'audio/midi'}));
    };
    const to2byte = n => [(n & 0xff00) >> 8, n & 0xff],
          to3byte = n => [(n & 0xff0000) >> 16, ...to2byte(n)],
          to4byte = n => [(n & 0xff000000) >> 24, ...to3byte(n)];
    const HeaderChunks = arr => {
        arr.push(0x4D, 0x54, 0x68, 0x64); // チャンクタイプ(4byte)
        arr.push(...to4byte(6)); // データ長(4byte)
        const {formatType, tracks, timeDivision} = g_midi;
        for(const v of [
            formatType,
            tracks,
            timeDivision
        ]) arr.push(...to2byte(v));
    };
    const TrackChunks = (arr, heap) => {
        arr.push(0x4D, 0x54, 0x72, 0x6B); // チャンクタイプ(4byte)
        const a = [];
        a.push(...DeltaTime(0));
        a.push(0xFF, 0x51, 0x03, ...to3byte(60000000 / inputBPM)); // テンポ
        let currentTime = 0;
        while(heap.length) {
            const {note, velocity, start} = heap.pop();
            a.push(...DeltaTime(start - currentTime));
            a.push(0x90, note, velocity);
            currentTime = start;
        }
        a.push(...DeltaTime(0));
        a.push(0xFF, 0x2F, 0x00); // トラックチャンクの終わりを示す
        arr.push(...to4byte(a.length)); // データ長(4byte)
        for(const v of a) arr.push(v);
    };
    const DeltaTime = n => { // 可変長数値表現
        if(n === 0) return [0];
        const arr = [];
        let i = 0;
        while(n) {
            const _7bit = n & 0x7F;
            n >>= 7;
            arr.unshift(_7bit | (i++ ? 0x80 : 0));
        }
        return arr;
    };
})();
