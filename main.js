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
        }
        get wh(){
            return [
                this.video.videoWidth,
                this.video.videoHeight
            ];
        }
        async load(url){
            $(this.video = await rpgen3.loadSrc('video', url)).appendTo(this.output.empty());
            const {video} = this;
            video.controls = true;
            const {cv, ctx} = rpgen3.makeCanvas(...this.wh);
            rpgen3.addBtn($('<div>').appendTo(this.output), '現在のシーンを保存', () => {
                ctx.drawImage(video, 0, 0);
                $('<a>').attr({
                    href: cv.toDataURL(),
                    download: 'video2midi.png'
                }).get(0).click();
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
    const image = new class {
        constructor(){
            const html = $('<div>').appendTo(main).addClass('container');
            $('<h3>').appendTo(html).text('二値化した鍵盤の画像の設定');
            this.input = $('<dl>').appendTo(html);
            this.output = $('<div>').appendTo(html);
            this.img = null;
            this.bothEnd = $('<div>').appendTo(html);
        }
        get wh(){
            return [
                this.img.naturalWidth,
                this.img.naturalHeight
            ];
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
            $('<h3>').appendTo(html).text('両端の鍵盤の中心の座標を入力');
            this.input = $('<dl>').appendTo(html);
            this._left = rpgen3.addInputStr(this.input, {
                label: '左端の鍵盤の中心座標',
                save: true
            });
            this._right = rpgen3.addInputStr(this.input, {
                label: '右端の鍵盤の中心座標',
                save: true
            });
        }
        _2(str){
            const m = rpgen3.toHan(str).match(/[0-9]+/g);
            if(m) return [m.map(Number), 0].flat().slice(0, 2);
            else return [0, 0];
        }
        get left(){
            return this._2(this._left());
        }
        get right(){
            return this._2(this._right());
        }
    };
    rpgen3.addBtn(main, 'start', () => start());
    const msg = new class {
        constructor(){
            this.html = $('<div>').appendTo(main);
        }
        async print(str){
            this.html.text(str);
            await rpgen3.sleep(0);
        }
    };
    const start = async () => {
        await msg.print('鍵盤の座標を取得');
        const mid = calcMid();
        const [x, y] = bothEnd.left;
    };
    const calcMid = () => {
        const [w, h] = image.wh,
              {cv, ctx} = rpgen3.makeCanvas(w, h);
        ctx.drawImage(image.img, 0, 0);
        const {data} = ctx.getImageData(0, 0, w, h),
              {left, right} = bothEnd,
              edge = [];
        let isEdge = false;
        for(let x = left[0]; x < right[0]; x++) {
            if(data[rpgen3.toI(w, x, left[1])]) { // white
                if(!isEdge) continue;
                isEdge = false;
            }
            else { // black
                if(isEdge) continue;
                isEdge = true;
                edge.push(x);
            }
        }
        const mid = [];
        for(let i = 1; i < edge.length; i++) mid.push(edge[i] - edge[i - 1] >> 1);
        mid.unshift(left[0]);
        mid.push(right[0]);
        return mid;
    };
})();
