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
    const rpgen3 = await importAll([
        'input',
        'css',
        'url',
        'hankaku',
        'sample',
        'util'
    ].map(v => `https://rpgen3.github.io/mylib/export/${v}.mjs`));
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
    $('<h2>').appendTo(head).text('動画をmidiに変換します。');
    const video = new class {
        constructor(){
            const html = $('<div>').appendTo(head).addClass('container');
            $('<h3>').appendTo(html).text('処理する動画の設定');
            this.input = $('<dl>').appendTo(html);
            this.output = $('<div>').appendTo(html);
            this.video = null;
        }
        async load(url){
            $(this.video = await rpgen3.loadSrc('video', url)).appendTo(this.output.empty());
            const {video} = this;
            video.controls = true;
            const width = video.videoWidth,
                  height = video.videoHeight,
                  [cv, ctx] = rpgen3.makeCanvas(width, height);
            $('<button>').text('現在のシーンを保存').on('click', () => {
                ctx.drawImage(video, 0, 0);
                $('<a>').attr({
                    href: cv.toDataURL(),
                    download: 'video2midi.png'
                }).get(0).click();
            }).appendTo($('<div>').appendTo(this.output));
        }
    };
    {
        const {input} = video;
        $('<dt>').appendTo(input).text('ファイル入力');
        $('<input>').appendTo($('<dd>').appendTo(input)).prop({
            type: 'file'
        }).on('change', ({target}) => {
            const {files} = target;
            if(files.length) video.load(URL.createObjectURL(files[0]));
        });
    }
})();
