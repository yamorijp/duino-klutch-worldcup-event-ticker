# duino-klutch-worldcup-event-ticker

[world_cup_json](https://github.com/estiens/world_cup_json)から取得したゲーム中のイベント情報を
[duino-klutch](https://github.com/yamorijp/duino-klutch)のMatrix LEDディスプレイで表示します。

* ゴール
* イエローカードやメンバー交代
* 試合開始と試合結果

等。

リアルタイムではありません。仕組み上メッセージが表示されるまで数分程度の遅れが発生します。

## セットアップと実行

nodejsを使用したワーカープロセスです。`worker.js`を`node`から実行してそのまま放っておきます。

```
$ yarn
$ yarn start
```


yamorijpは、サッカー日本代表を応援しています。