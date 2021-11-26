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
            $('<h3>').appendTo(html).text('両端の鍵盤の中心の座標を入力');
            const input = $('<dl>').appendTo(html);
            this.way = rpgen3.addSelect(input, {
                label: '鍵盤の並ぶ向き',
                list: {
                    '水平': true,
                    '垂直': false
                }
            });
            this.datum = rpgen3.addInputNum(input, {
                label: '基準線の座標',
                save: true
            });
            this.left = rpgen3.addInputNum(input, {
                label: '左端の鍵盤の中心座標',
                save: true
            });
            this.right = rpgen3.addInputNum(input, {
                label: '右端の鍵盤の中心座標',
                save: true
            });
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

    };
    const calcMid = () => {
        const {w, h} = image,
              {cv, ctx} = rpgen3.makeCanvas(w, h);
        ctx.drawImage(image.img, 0, 0);
        const {data} = ctx.getImageData(0, 0, w, h),
              way = bothEnd.way(),
              datum = bothEnd.datum(),
              left = bothEnd.left(),
              right = bothEnd.right(),
              edge = [];
        let isEdge = false;
        const toI = x => rpgen3.toI(w, ...(way ? [x, datum] : [datum, x]));
        for(let x = left; x < right; x++) {
            if(data[toI(x)]) { // white
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
        mid.unshift(left);
        mid.push(right);
        return mid;
    };
})();
