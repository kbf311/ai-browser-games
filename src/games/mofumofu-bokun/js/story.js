// =========================================================
// 『もふもふ暴君と秘密の添い寝 〜わがままメインクーンお世話日誌〜』
// シナリオデータ
// =========================================================

const CG_ASSETS = window.__GAME_ASSETS__ || {
  tsun: 'assets/images/cg_tsun.png',
  grooming: 'assets/images/cg_grooming.jpg',
  angry: 'assets/images/cg_angry_attack.png',
  sleep: 'assets/images/cg_reward_sleep.png'
};

const GALLERY_ITEMS = [
  {
    id: 'tsun',
    src: CG_ASSETS.tsun,
    title: '高貴なるツンデレ暴君',
    desc: 'お気に入りのクッションから、黄金の瞳でチラリとこちらを見つめるレオ様。'
  },
  {
    id: 'grooming',
    src: CG_ASSETS.grooming,
    title: '至福のブラッシング＆おやつ',
    desc: '「べ、別に気持ちよくなんてないんだからね……！」（喉ゴロゴロ）'
  },
  {
    id: 'angry',
    src: CG_ASSETS.angry,
    title: '暴君の逆鱗（BAD END）',
    desc: '選択肢を間違えた下僕に下される、鋭利な爪と牙の死の制裁。'
  },
  {
    id: 'sleep',
    src: CG_ASSETS.sleep,
    title: 'ご褒美タイム・秘密の添い寝',
    desc: '完璧なお世話をやり遂げた者だけに許される、もふもふ温もりタイム。'
  }
];

const STORY_NODES = {
  // -------------------------------------------------------
  // 第1章：朝（お目覚め＆ごはんタイム）
  // -------------------------------------------------------
  start: {
    phaseIcon: '☀️',
    phaseText: '朝・お目覚め',
    cg: CG_ASSETS.tsun,
    affection: 20,
    checkpoint: 'start',
    lines: [
      {
        speaker: '',
        text: '柔らかな朝日が差し込むワンルーム。今日も「わが家のご主人様」が目を覚ましたようだ。'
      },
      {
        speaker: '',
        text: '体重8キロを超える巨体、銀白のゴージャスな長毛、そして黄金の瞳――\nわがまま気高きメインクーンの「レオ」である。'
      },
      {
        speaker: 'レオ',
        text: '「……フン。ようやく起きたのね、下僕。\nあたしの腹時計はとっくに朝ごはんの時間を過ぎてるんだけど？」',
        sfx: 'meow_tsun'
      },
      {
        speaker: '',
        text: 'クッションの上からツンとそっぽを向きつつ、チラリとこちらを睨むレオ。\n最初のお世話から失敗は許されない。どう対応しよう？'
      }
    ],
    choices: [
      {
        text: '「お腹すいたね！」と笑って、いきなりお腹をモフモフ撫でまわす',
        next: 'bad_morning_belly'
      },
      {
        text: '最高級サーモン入りウェットフードを人肌に温め、恭しく差し出す',
        next: 'morning_success'
      },
      {
        text: '「寝起きで眠いから、カリカリ自分で食べて」と適当に済ませる',
        next: 'bad_morning_neglect'
      }
    ]
  },

  bad_morning_belly: {
    phaseIcon: '💀',
    phaseText: '朝・惨劇',
    cg: CG_ASSETS.angry,
    affection: 0,
    effect: 'damage',
    lines: [
      {
        speaker: 'レオ',
        mood: 'angry',
        text: '「――は？　寝起きで礼儀もなしに腹に触るつもり！？\nこの無礼者！！　二度と手が出せないようにしてやるわ！！」',
        sfx: 'attack'
      },
      {
        speaker: '',
        text: '次の瞬間、巨体から繰り出された電光石火の噛みつき！\n万力のような顎が腕に食い込み、鋭い爪の連撃が容赦なく降り注ぐ……！'
      }
    ],
    ending: {
      type: 'bad',
      title: 'BAD END 1：禁断の腹モフ・顎の万力',
      desc: '空腹かつ寝起きのメインクーンのお腹に不用意に触れた結果、腕をガッツリ噛み砕かれて出血多量で死亡した。お腹は信頼の証、焦りは禁物である。'
    }
  },

  bad_morning_neglect: {
    phaseIcon: '💀',
    phaseText: '朝・惨劇',
    cg: CG_ASSETS.angry,
    affection: 0,
    effect: 'damage',
    lines: [
      {
        speaker: 'レオ',
        mood: 'angry',
        text: '「……へぇ。下僕のくせに、あたしにセルフサービスを命じるわけ？\nいい度胸じゃない。その眠気、永久に覚ましてあげるッ！！」',
        sfx: 'attack'
      },
      {
        speaker: '',
        text: '猛獣の咆哮とともに飛びかかる銀白の弾丸！\n鋭利な爪が顔面と喉元を鮮やかに切り裂き、視界が真っ赤に染まった……！'
      }
    ],
    ending: {
      type: 'bad',
      title: 'BAD END 2：朝の逆鱗・鋭利な爪の洗礼',
      desc: 'ごはんを適当に済ませようとした怠慢がレオの逆鱗に触れ、無数の引っかき傷を負って息絶えた。暴君の朝食は命がけで用意すべし。'
    }
  },

  morning_success: {
    phaseIcon: '☀️',
    phaseText: '朝・朝食完了',
    cg: CG_ASSETS.tsun,
    affection: 38,
    checkpoint: 'noon_start',
    lines: [
      {
        speaker: '',
        text: '人肌に温めた最高級サーモンの芳醇な香りが部屋に広がる。\nレオの鼻がヒクヒクとわずかに揺れた。',
        sfx: 'good'
      },
      {
        speaker: 'レオ',
        text: '「……チッ、仕方ないわね。そこまで懇願するなら食べてやらないこともないわ。\nべ、別にアンタが用意したから嬉しいわけじゃないんだからね！」'
      },
      {
        speaker: '',
        text: 'そう言いつつ、尻尾をピンと立てて綺麗に完食したレオ。\nまずは朝の関門を突破したようだ！'
      }
    ],
    next: 'noon_start'
  },

  // -------------------------------------------------------
  // 第2章：昼（長毛のお手入れ・ブラッシング）
  // -------------------------------------------------------
  noon_start: {
    phaseIcon: '🌤️',
    phaseText: '昼・毛づくろい',
    cg: CG_ASSETS.tsun,
    affection: 40,
    checkpoint: 'noon_start',
    lines: [
      {
        speaker: '',
        text: '食後の日向ぼっこをしていたレオだが、ふと首元のゴージャスな飾り毛（ラッフ）に毛玉ができかけているのに気づいた。'
      },
      {
        speaker: 'レオ',
        text: '「……何ジロジロ見てるのよ。毛並みが乱れてる？\nほら、あたしは世界一美しいメインクーンなんだから、完璧に整えなさいよね！」'
      },
      {
        speaker: '',
        text: 'メインクーンの長毛は絡まりやすく繊細だ。\nどうお手入れするのがベストだろう？'
      }
    ],
    choices: [
      {
        text: '専用の柔らかいスリッカーブラシで、顎下から少しずつ丁寧にほぐす',
        next: 'noon_success'
      },
      {
        text: '毛玉が頑固そうなので、力任せにブラシでグイッと引っ張る',
        next: 'bad_noon_pull'
      },
      {
        text: '「いっそ丸洗いしよう！」と無理やりお風呂場へ抱えていく',
        next: 'bad_noon_bath'
      }
    ]
  },

  bad_noon_pull: {
    phaseIcon: '💀',
    phaseText: '昼・惨劇',
    cg: CG_ASSETS.angry,
    affection: 0,
    effect: 'damage',
    lines: [
      {
        speaker: 'レオ',
        mood: 'angry',
        text: '「――イタッ！！　何すんのよこのバカ下僕！！\nあたしの自慢の被毛を引きちぎる気！？　死になさいッ！！」',
        sfx: 'attack'
      },
      {
        speaker: '',
        text: 'ブチッという音とともに豹変したレオが、マッハの速度で連続猫パンチ＆引っかきコンボを炸裂させる！\nあまりの衝撃に意識が遠のいていく……！'
      }
    ],
    ending: {
      type: 'bad',
      title: 'BAD END 3：剛毛の逆襲・連続猫パンチ',
      desc: '毛玉を力任せに引っ張って激痛を与えたため、レオの怒りの鉄槌（爪付き）が全身を襲い戦闘不能・死亡した。ブラッシングは愛と忍耐である。'
    }
  },

  bad_noon_bath: {
    phaseIcon: '💀',
    phaseText: '昼・惨劇',
    cg: CG_ASSETS.angry,
    affection: 0,
    effect: 'damage',
    lines: [
      {
        speaker: 'レオ',
        mood: 'angry',
        text: '「シャアアアアッ！！　水！？　お風呂なんて聞いてない！！\n離せ！　離さないと首を噛み千切るわよ！！」',
        sfx: 'attack'
      },
      {
        speaker: '',
        text: 'パニックと激怒が頂点に達した8キロの大型猫が、背中にしがみつき必殺のネックバイトを発動！\n浴室のタイルが暗転していく……！'
      }
    ],
    ending: {
      type: 'bad',
      title: 'BAD END 4：水嫌いの狂気・必殺ネックバイト',
      desc: '何の予告もなくお風呂に連れ込もうとして、首筋を思い切り噛まれて絶命した。大型猫のパニックを甘く見てはいけない。'
    }
  },

  noon_success: {
    phaseIcon: '🌤️',
    phaseText: '昼・うっとり',
    cg: CG_ASSETS.grooming,
    affection: 58,
    checkpoint: 'afternoon_start',
    lines: [
      {
        speaker: '',
        text: '毛先から少しずつ、優しく丁寧にブラシを通していく。\n絡まりがほぐれるたび、レオの肩からすっと力が抜けていった。',
        sfx: 'purr'
      },
      {
        speaker: 'レオ',
        mood: 'dere',
        text: '「んっ……ふぅ……。\nゴロゴロゴロ……っ、あ、ちがっ！　今のは喉が鳴ったんじゃなくて、空調の音だから！！」'
      },
      {
        speaker: '',
        text: '頬をほんのり赤らめながら、目を細めてうっとりするレオ。\n必死にツンを取り繕う姿がたまらなく愛おしい！'
      }
    ],
    next: 'afternoon_start'
  },

  // -------------------------------------------------------
  // 第3章：午後（気まぐれおやつタイム）
  // -------------------------------------------------------
  afternoon_start: {
    phaseIcon: '🍰',
    phaseText: '午後・おやつ',
    cg: CG_ASSETS.tsun,
    affection: 60,
    checkpoint: 'afternoon_start',
    lines: [
      {
        speaker: '',
        text: '午後3時。クッションに寝そべっていたレオが、尻尾の先をリズミカルに揺らしている。'
      },
      {
        speaker: 'レオ',
        text: '「ねぇ、下僕。そろそろ『特別な貢ぎ物』の時間じゃない？\nあたしの機嫌を取りたいなら、センスの良いものを持ってきなさいよね」'
      },
      {
        speaker: '',
        text: 'おやつの時間だ。どんな風に差し出そうか？'
      }
    ],
    choices: [
      {
        text: 'おやつを目の前で焦らしつつ「お手！できたらあげるよ」と芸を強要する',
        next: 'bad_afternoon_tease'
      },
      {
        text: '無添加フリーズドライささみ＆特製おやつスプーンを絶妙な距離感で差し出す',
        next: 'afternoon_success'
      },
      {
        text: '人間用のチョコケーキを「一口だけなら大丈夫でしょ」と差し出す',
        next: 'bad_afternoon_humanfood'
      }
    ]
  },

  bad_afternoon_tease: {
    phaseIcon: '💀',
    phaseText: '午後・惨劇',
    cg: CG_ASSETS.angry,
    affection: 0,
    effect: 'damage',
    lines: [
      {
        speaker: 'レオ',
        mood: 'angry',
        text: '「……は？　あたしを犬と同じ扱いにして『お手』をしろと？\nプライドを傷つけた罪は万死に値するわ。その指ごと食いちぎってあげる！！」',
        sfx: 'attack'
      },
      {
        speaker: '',
        text: 'おやつではなく、こちらの指ごとガブリ！！\n想像を絶する咬合力に悲鳴を上げる間もなく、暗闇に沈んでいった……！'
      }
    ],
    ending: {
      type: 'bad',
      title: 'BAD END 5：プライド粉砕・処刑の牙',
      desc: '気高き暴君におやつでマウントを取ろうとした結果、指ごと噛み砕かれてショック死した。猫は従わせるものではなく崇めるものである。'
    }
  },

  bad_afternoon_humanfood: {
    phaseIcon: '💀',
    phaseText: '午後・惨劇',
    cg: CG_ASSETS.angry,
    affection: 0,
    effect: 'damage',
    lines: [
      {
        speaker: 'レオ',
        mood: 'angry',
        text: '「チョコ！？　猫に毒なものを差し出すなんて、さては暗殺者ね！？\n返り討ちにしてやるッ！！　お前の顔面を爪とぎにしてやるわ！！」',
        sfx: 'attack'
      },
      {
        speaker: '',
        text: '毒殺未遂とみなされた下僕に、怒涛の顔面ダイブ＆引っかき十連撃が炸裂！\nこうしてひとつの命が散った……！'
      }
    ],
    ending: {
      type: 'bad',
      title: 'BAD END 6：暗殺疑惑・怒りの顔面ダイブ',
      desc: '猫に禁忌の人間用スイーツを与えようとして激怒を買い、顔面を引っかき回されて死亡した。猫の食事管理は徹底すべし。'
    }
  },

  afternoon_success: {
    phaseIcon: '🍰',
    phaseText: '午後・ご満悦',
    cg: CG_ASSETS.grooming,
    affection: 76,
    checkpoint: 'evening_start',
    lines: [
      {
        speaker: '',
        text: '高級おやつスプーンに乗せた無添加ささみを差し出すと、レオは上品にペロリと舐めとった。',
        sfx: 'good'
      },
      {
        speaker: 'レオ',
        mood: 'dere',
        text: '「んむ……悪くないわね。合格点をあげてもいいわ。\n……ほ、ほら、アンタの手から食べてやったんだから、感謝しなさいよ？」'
      },
      {
        speaker: '',
        text: '食べ終わったあと、こちらの指先をほんの一瞬だけペロッと舐めてから、恥ずかしそうに顔を背けるレオ。\n距離がぐっと縮まった気がする！'
      }
    ],
    next: 'evening_start'
  },

  // -------------------------------------------------------
  // 第4章：夕方（狩猟本能・遊びタイム）
  // -------------------------------------------------------
  evening_start: {
    phaseIcon: '🌇',
    phaseText: '夕方・遊びタイム',
    cg: CG_ASSETS.tsun,
    affection: 78,
    checkpoint: 'evening_start',
    lines: [
      {
        speaker: '',
        text: '日が傾き始めた夕方。レオの瞳孔がまん丸に広がり、低い姿勢で腰を振り始めた。'
      },
      {
        speaker: 'レオ',
        text: '「……退屈よ、下僕。そろそろ運動してあげてもいい頃合いね。\nあたしの狩猟本能を満たしてみせなさい！」'
      },
      {
        speaker: '',
        text: '本気モードの大型猫を満足させなければならない。\nどうやって遊んであげよう？'
      }
    ],
    choices: [
      {
        text: '素手をモゾモゾ動かして、直接レオの目の前で揺らしてみる',
        next: 'bad_evening_hand'
      },
      {
        text: 'レーザーポインターをわざとレオの顔面に当ててからかう',
        next: 'bad_evening_laser'
      },
      {
        text: '長めの羽つき猫じゃらしを使い、獲物の動きを再現して最後に捕まえさせる',
        next: 'evening_success'
      }
    ]
  },

  bad_evening_hand: {
    phaseIcon: '💀',
    phaseText: '夕方・惨劇',
    cg: CG_ASSETS.angry,
    affection: 0,
    effect: 'damage',
    lines: [
      {
        speaker: 'レオ',
        mood: 'angry',
        text: '「フシャーッ！！　動く肉塊発見！！\n獲物は逃がさないわよッ！！」',
        sfx: 'attack'
      },
      {
        speaker: '',
        text: '素手を「最高の獲物」と認識したレオが、全力の噛みつき＆後ろ足ケリケリを繰り出す！\n手首がズタズタに引き裂かれ、ゲームオーバー……！'
      }
    ],
    ending: {
      type: 'bad',
      title: 'BAD END 7：ハンターの本能・肉食獣の餌食',
      desc: '素手をおもちゃ代わりにした愚行により、手首を完全に獲物とみなされ噛み砕かれて死亡した。遊びには必ずおもちゃを使おう。'
    }
  },

  bad_evening_laser: {
    phaseIcon: '💀',
    phaseText: '夕方・惨劇',
    cg: CG_ASSETS.angry,
    affection: 0,
    effect: 'damage',
    lines: [
      {
        speaker: 'レオ',
        mood: 'angry',
        text: '「……眩しい上に、捕まえられない光でバカにする気！？\nいいわ、お前という一番デカい獲物を狩ってやるッ！！」',
        sfx: 'attack'
      },
      {
        speaker: '',
        text: 'キャットタワーの頂上から、8キロの巨体が一直線に急降下！！\n閃光のような爪の一撃を浴びて、意識が吹き飛んだ……！'
      }
    ],
    ending: {
      type: 'bad',
      title: 'BAD END 8：屈辱の代償・天井からの急襲',
      desc: 'レーザーでからかい続けてストレスを溜めさせた結果、キャットタワーからのダイブ＆引っかき攻撃で命を落とした。'
    }
  },

  evening_success: {
    phaseIcon: '🌇',
    phaseText: '夕方・大満足',
    cg: CG_ASSETS.tsun,
    affection: 90,
    checkpoint: 'night_start',
    lines: [
      {
        speaker: '',
        text: '長めの猫じゃらしで小鳥のように緩急をつけて動かし、クライマックスでしっかりとレオにキャッチさせる！',
        sfx: 'good'
      },
      {
        speaker: 'レオ',
        mood: 'dere',
        text: '「ハァ、ハァ……どう見た！？　あたしの華麗なハンティングを！\nま、まあ……アンタの操り方も、少しはマシになってきたんじゃない？」'
      },
      {
        speaker: '',
        text: '自慢げに胸を張って羽を咥えるレオ。たっぷり遊んで心地よく疲れたようだ。\nいよいよ、一日の締めくくりがやってくる――。'
      }
    ],
    next: 'night_start'
  },

  // -------------------------------------------------------
  // 第5章：夜（就寝前・運命の最終選択）
  // -------------------------------------------------------
  night_start: {
    phaseIcon: '🌙',
    phaseText: '夜・おやすみ前',
    cg: CG_ASSETS.tsun,
    affection: 92,
    checkpoint: 'night_start',
    lines: [
      {
        speaker: '',
        text: '夜も更け、部屋に静かな月明かりと暖かな間接照明だけが灯る。\n少し肌寒くなってきた頃、レオがベッドのそばにやってきてじっとこちらを見つめている。'
      },
      {
        speaker: 'レオ',
        text: '「……ねぇ。夜になって、ちょっと冷えてきたみたいだけど。\nアンタ、今夜はどうするつもりなの？」'
      },
      {
        speaker: '',
        text: '黄金の瞳がわずかに揺れている。今日一日、完璧にお世話をやり遂げた。\nこの最後の選択が、運命を決める――！'
      }
    ],
    choices: [
      {
        text: '「夜はお利口にケージで寝てね」とケージの扉を閉める',
        next: 'bad_night_cage'
      },
      {
        text: '「寒いなら！」とレオを無理やり抱きかかえて布団に引きずり込む',
        next: 'bad_night_force'
      },
      {
        text: '「レオ様、お布団あたたまってますよ」と少し隙間を空けて静かに待つ',
        next: 'reward_sleep_start'
      }
    ]
  },

  bad_night_cage: {
    phaseIcon: '💀',
    phaseText: '深夜・惨劇',
    cg: CG_ASSETS.angry,
    affection: 0,
    effect: 'damage',
    lines: [
      {
        speaker: 'レオ',
        mood: 'angry',
        text: '「……せっかく隣に行ってやろうと思ったのに、檻に閉じ込める気！？\n絶対許さない……絶対にだッ！！」',
        sfx: 'attack'
      },
      {
        speaker: '',
        text: '深夜2時――。器用にケージの鍵をこじ開けた暗殺猫が、熟睡中の下僕へ静かに忍び寄り……\n鋭い牙と爪で永遠の眠りへと誘ったのだった。'
      }
    ],
    ending: {
      type: 'bad',
      title: 'BAD END 9：孤独の復讐・深夜の暗殺猫',
      desc: 'デレかけていたレオをケージに閉じ込めたことで、深夜の脱走＆寝込み襲撃を受けて死亡した。ツンデレのサインを見逃すなかれ。'
    }
  },

  bad_night_force: {
    phaseIcon: '💀',
    phaseText: '深夜・惨劇',
    cg: CG_ASSETS.angry,
    affection: 0,
    effect: 'damage',
    lines: [
      {
        speaker: 'レオ',
        mood: 'angry',
        text: '「キャアアッ！？　いきなり抱きつくな変態下僕！！\nあたしは自分のタイミングで寝るの！　反省しなさい！！」',
        sfx: 'attack'
      },
      {
        speaker: '',
        text: '束縛を嫌う猫の本能が爆発！\n8キロの巨体によるフルパワー後ろ足ケリケリ＆噛みつきコンボを至近距離で浴び、力尽きた……！'
      }
    ],
    ending: {
      type: 'bad',
      title: 'BAD END 10：束縛拒否・フルパワー蹴りぐるみ刑',
      desc: '無理やり布団に引きずり込んだ結果、必殺の連続キックと噛みつきを食らって昇天した。主導権は常にレオ様に譲るべし。'
    }
  },

  // -------------------------------------------------------
  // ご褒美タイム・添い寝ハッピーエンド！
  // -------------------------------------------------------
  reward_sleep_start: {
    phaseIcon: '💖',
    phaseText: 'ご褒美タイム・添い寝',
    cg: CG_ASSETS.sleep,
    affection: 100,
    effect: 'particles',
    lines: [
      {
        speaker: '',
        text: '布団の端を少し持ち上げて、静かに待っていると――\nレオは気取った足取りでゆっくりとベッドに上がり、枕元をくるりと一周した。',
        sfx: 'purr'
      },
      {
        speaker: '',
        text: 'そして次の瞬間、ドサッと重みのある温かいもふもふの塊が、すぐ隣にぴったりと身を寄せてきた。'
      },
      {
        speaker: 'レオ',
        mood: 'dere',
        text: '「……べ、別に寂しかったわけじゃないんだからね。\nただ、アンタの布団が一番あったかそうだったから……仕方なく寝てあげてるだけなんだから」'
      },
      {
        speaker: '',
        text: 'そう言いながらも、レオは幸せそうに目を閉じ、喉の奥から心地よい重低音のゴロゴロ音を響かせている。\n柔らかく豊かな銀白の被毛から、お日さまとミルクのような甘い温もりが伝わってくる。'
      },
      {
        speaker: 'レオ',
        mood: 'dere',
        text: '「ん……もっと近くにいても、いいわよ……。\n今日は……特別に、撫でるのも許してあげる。……おやすみ、あたしの下僕」'
      }
    ],
    rewardMode: true
  }
};
