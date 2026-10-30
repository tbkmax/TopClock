// Each entry keeps the English source and its Simplified Chinese, Traditional
// Chinese, and Japanese translations together so missing strings are visible.
const messages = {
    'app.settingsTitle': ['TopClock Settings', 'TopClock 设置', 'TopClock 設定', 'TopClock 設定'],
    'app.settingsBrand': ['/ SETTINGS', '/ 设置', '/ 設定', '/ 設定'],
    'app.settings': ['Settings', '设置', '設定', '設定'],
    'app.quit': ['Quit', '结束', '結束', '終了'],
    'app.resetTimer': ['Reset timer', '重置计时器', '重設計時器', 'タイマーをリセット'],
    'app.moveHint': ['Hold {modifier} to move or right-click', '按住 {modifier} 可移动或按右键', '按住 {modifier} 可移動或按右鍵', '{modifier} キーを押しながら移動または右クリック'],
    'app.closeSettings': ['Close settings', '关闭设置', '關閉設定', '設定を閉じる'],
    'app.minimize': ['Minimize', '最小化', '最小化', '最小化'],
    'app.settingsSections': ['Settings sections', '设置分区', '設定區段', '設定セクション'],
    'app.settingsTabs': ['Settings tabs', '设置选项卡', '設定分頁', '設定タブ'],
    'app.workspace': ['WORKSPACE', '工作区', '工作區', 'ワークスペース'],
    'app.clockRunning': ['CLOCK RUNNING', '时钟运行中', '時鐘執行中', '時計は動作中'],
    'tab.clock': ['Clock', '时钟', '時鐘', '時計'],
    'tab.addons': ['Add-ons', '附加功能', '附加功能', 'アドオン'],
    'tab.shortcuts': ['Shortcuts', '快捷键', '快捷鍵', 'ショートカット'],
    'tab.general': ['General', '一般', '一般', '一般'],
    'tab.generalUpdate': ['General, update available', '一般，有可用更新', '一般，有可用更新', '一般、更新あり'],
    'tab.updateAvailable': ['Update available', '有可用更新', '有可用更新', '更新あり'],
    'clock.section': ['DISPLAY / 01', '显示 / 01', '顯示 / 01', '表示 / 01'],
    'clock.title': ['Make time yours', '定制你的时间', '自訂你的時間', '時計を自分好みに'],
    'clock.description': ['Changes appear on your desktop clock as you make them.', '更改会立即显示在桌面时钟上。', '變更會立即顯示在桌面時鐘上。', '変更はデスクトップの時計にすぐ反映されます。'],
    'clock.livePreview': ['LIVE PREVIEW', '实时预览', '即時預覽', 'ライブプレビュー'],
    'clock.live': ['LIVE', '实时', '即時', 'ライブ'],
    'clock.previewScaled': ['Large sizes are scaled down in this preview', '预览中会缩小大尺寸时钟', '預覽中會縮小大尺寸時鐘', '大きいサイズはプレビュー内で縮小されます'],
    'clock.previewInstant': ['Your desktop clock updates instantly', '桌面时钟会立即更新', '桌面時鐘會立即更新', 'デスクトップの時計はすぐに更新されます'],
    'clock.fontColor': ['Font color', '字体颜色', '字體顏色', '文字色'],
    'clock.fontColorDescription': ['The face of your clock', '时钟文字的颜色', '時鐘文字的顏色', '時計の文字の色'],
    'clock.outlineColor': ['Outline color', '描边颜色', '外框顏色', '縁取りの色'],
    'clock.outlineColorDescription': ['Contrast against your desktop', '让时钟在桌面上更清晰', '讓時鐘在桌面上更清晰', 'デスクトップ上での見やすさを調整'],
    'clock.size': ['Clock size', '时钟大小', '時鐘大小', '時計のサイズ'],
    'clock.sizeDescription': ['Set the type size from 24 to 200 pixels', '将字号设为 24 至 200 像素', '將字級設為 24 至 200 像素', '文字サイズを 24～200 ピクセルに設定'],
    'clock.outlineThickness': ['Outline thickness', '描边粗细', '外框粗細', '縁取りの太さ'],
    'clock.outlineThicknessDescription': ['From no outline to a bold 4 pixel edge', '从无描边到 4 像素粗描边', '從無外框到 4 像素粗外框', '縁取りなしから 4 ピクセルまで'],
    'clock.fontFamily': ['Font family', '字体', '字體', 'フォント'],
    'clock.fontUnavailable': ['Windows font list is unavailable', '无法获取 Windows 字体列表', '無法取得 Windows 字體清單', 'Windows のフォント一覧を取得できません'],
    'clock.loadingFonts': ['Loading installed fonts…', '正在加载已安装字体…', '正在載入已安裝字體…', 'インストール済みフォントを読み込み中…'],
    'clock.installedFonts': ['{count} installed fonts', '已安装 {count} 种字体', '已安裝 {count} 種字體', 'インストール済みフォント: {count} 件'],
    'clock.timeLayout': ['Time layout', '时间布局', '時間版面', '時刻の表示形式'],
    'clock.timeLayoutDescription': ['Choose which parts appear', '选择显示的时间部分', '選擇顯示的時間部分', '表示する時刻の要素を選択'],
    'clock.twentyFour': ['24-hour time', '24 小时制', '24 小時制', '24 時間表示'],
    'clock.twentyFourDescription': ['Use 18 instead of 06 in the evening', '晚上显示 18 而不是 06', '晚上顯示 18 而非 06', '夕方の時刻を 06 ではなく 18 と表示'],
    'clock.showAmPm': ['Show AM / PM', '显示上午／下午', '顯示上午／下午', '午前／午後を表示'],
    'clock.showAmPmAccessible': ['Show AM or PM', '显示上午或下午', '顯示上午或下午', '午前または午後を表示'],
    'clock.showAmPmDescription': ['Label morning and evening in 12-hour time', '在 12 小时制中标明上午和下午', '在 12 小時制中標明上午和下午', '12 時間表示で午前・午後を表示'],
    'clock.colonAnimation': ['Colon animation', '冒号动画', '冒號動畫', 'コロンのアニメーション'],
    'clock.colonAnimationDescription': ['Motion for the separators', '时间分隔符的动画', '時間分隔符的動畫', '区切り記号の動き'],
    'clock.numberAnimation': ['Number change animation', '数字变化动画', '數字變化動畫', '数字の切り替えアニメーション'],
    'clock.numberAnimationDescription': ['Motion when a displayed number changes', '数字变化时的动画', '數字變化時的動畫', '表示する数字が変わるときの動き'],
    'animation.pulse': ['Classic pulse', '经典脉动', '經典脈動', '標準の点滅'],
    'animation.tick': ['Yellow tick', '黄色闪动', '黃色閃動', '黄色の点滅'],
    'animation.fade': ['Soft fade', '柔和淡入淡出', '柔和淡入淡出', '柔らかなフェード'],
    'animation.slide': ['Gentle slide', '轻柔滑动', '輕柔滑動', 'なめらかなスライド'],
    'animation.none': ['None', '无', '無', 'なし'],
    'clock.position': ['Clock position', '时钟位置', '時鐘位置', '時計の位置'],
    'clock.positionDescription': ['Center clocks currently shown on displays', '将当前显示的时钟居中', '將目前顯示的時鐘置中', '表示中の時計を画面中央に配置'],
    'clock.resetting': ['Resetting…', '正在重置…', '正在重設…', 'リセット中…'],
    'clock.resetPositions': ['Reset positions', '重置位置', '重設位置', '位置をリセット'],
    'addons.section': ['EXTENSIONS / 02', '扩展 / 02', '擴充 / 02', '拡張 / 02'],
    'addons.title': ['More than time', '不止于时间', '不只是時間', '時刻だけじゃない'],
    'addons.description': ['Place useful details around your clock. Add-ons share one layout so they never overlap.', '在时钟周围显示实用信息。附加功能共用布局，不会重叠。', '在時鐘周圍顯示實用資訊。附加功能共用版面，不會重疊。', '時計の周囲に便利な情報を表示します。アドオン同士は重なりません。'],
    'addons.desktopLayout': ['DESKTOP LAYOUT', '桌面布局', '桌面版面', 'デスクトップの配置'],
    'addons.add': ['ADD ADD-ONS', '添加附加功能', '新增附加功能', 'アドオンを追加'],
    'addons.yours': ['YOUR ADD-ONS', '你的附加功能', '你的附加功能', '追加済みアドオン'],
    'addons.empty': ['Add a date, region clock, timer, or progress bar to get started.', '添加日期、地区时钟、计时器或进度条以开始。', '新增日期、地區時鐘、計時器或進度條以開始。', '日付、地域時計、タイマー、進捗バーを追加してください。'],
    'addons.addButton': ['Add', '添加', '新增', '追加'],
    'addons.added': ['Added', '已添加', '已新增', '追加済み'],
    'addons.date': ['Date', '日期', '日期', '日付'],
    'addons.dateDescription': ['Show the local calendar date.', '显示本地日期。', '顯示本地日期。', '現地の日付を表示します。'],
    'addons.region_clock': ['Region clock', '地区时钟', '地區時鐘', '地域時計'],
    'addons.region_clockDescription': ['Show time in another region.', '显示其他地区的时间。', '顯示其他地區的時間。', '別の地域の時刻を表示します。'],
    'addons.timer': ['Timer', '计时器', '計時器', 'タイマー'],
    'addons.timerDescription': ['Count down or use a stopwatch.', '倒计时或正计时。', '倒數計時或碼錶。', 'カウントダウンまたはストップウォッチを使います。'],
    'addons.timerSubtitle': ['Countdown or stopwatch', '倒计时或正计时', '倒數計時或碼錶', 'カウントダウンまたはストップウォッチ'],
    'addons.progress': ['Progress', '进度', '進度', '進捗'],
    'addons.progressInstance': ['Progress {count}', '进度 {count}', '進度 {count}', '進捗 {count}'],
    'addons.progressDescription': ['Track a date or daily time ranges.', '跟踪日期或每日时段。', '追蹤日期或每日時段。', '日付または毎日の時間帯の進捗を表示します。'],
    'addons.progressMode': ['Progress mode', '进度模式', '進度模式', '進捗モード'],
    'addons.dateProgress': ['Date progress', '日期进度', '日期進度', '日付の進捗'],
    'addons.timeProgress': ['Daily time progress', '每日时间进度', '每日時間進度', '毎日の時間進捗'],
    'addons.progressRangeCount': ['{count} daily ranges', '每日 {count} 个时段', '每日 {count} 個時段', '毎日 {count} 件の時間帯'],
    'addons.startDate': ['Start date', '开始日期', '開始日期', '開始日'],
    'addons.endDate': ['End date', '结束日期', '結束日期', '終了日'],
    'addons.dailyRanges': ['DAILY TIME RANGES', '每日时段', '每日時段', '毎日の時間帯'],
    'addons.startTime': ['Start time', '开始时间', '開始時間', '開始時刻'],
    'addons.endTime': ['End time', '结束时间', '結束時間', '終了時刻'],
    'addons.addRange': ['Add time range', '添加时段', '新增時段', '時間帯を追加'],
    'addons.removeRange': ['Remove time range', '移除时段', '移除時段', '時間帯を削除'],
    'addons.autoHide': ['Hide after all ranges finish', '所有时段完成后隐藏', '所有時段完成後隱藏', 'すべての時間帯が終了したら非表示'],
    'addons.autoHideHint': ['Stays visible for one minute after the last range, then returns tomorrow.', '最后一个时段结束后显示一分钟，次日重新显示。', '最後一個時段結束後顯示一分鐘，隔天重新顯示。', '最後の時間帯の終了後1分間表示し、翌日に再表示します。'],
    'addons.invalidProgressDate': ['End date must be after a valid start date.', '结束日期必须晚于有效的开始日期。', '結束日期必須晚於有效的開始日期。', '有効な開始日より後の終了日を指定してください。'],
    'addons.invalidProgressRange': ['Time ranges must be ordered, nonoverlapping, and end on the same day.', '时段必须按顺序排列、不重叠，并在当天结束。', '時段必須依序排列、不重疊，並在當天結束。', '時間帯を順番に並べ、重複させず、同じ日のうちに終了させてください。'],
    'addons.localDate': ['Local date', '本地日期', '本地日期', '現地の日付'],
    'addons.enable': ['Enable {name}', '启用{name}', '啟用{name}', '{name}を有効にする'],
    'addons.position': ['Position', '位置', '位置', '位置'],
    'addons.positionFor': ['Position for {name}', '{name}的位置', '{name}的位置', '{name}の位置'],
    'addons.above': ['Above clock', '时钟上方', '時鐘上方', '時計の上'],
    'addons.below': ['Below clock', '时钟下方', '時鐘下方', '時計の下'],
    'addons.textSize': ['Text size', '文字大小', '文字大小', '文字サイズ'],
    'addons.textSizeFor': ['Text size for {name}', '{name}的文字大小', '{name}的文字大小', '{name}の文字サイズ'],
    'addons.dateFormat': ['Date format', '日期格式', '日期格式', '日付の形式'],
    'addons.ymd': ['Year-Month-Day', '年-月-日', '年-月-日', '年-月-日'],
    'addons.md': ['Month-Day', '月-日', '月-日', '月-日'],
    'addons.day': ['Day only', '仅日期', '僅日期', '日のみ'],
    'addons.showWeekday': ['Show weekday', '显示星期', '顯示星期', '曜日を表示'],
    'addons.showWeekdayAfter': ['Show weekday after date', '在日期后显示星期', '在日期後顯示星期', '日付の後に曜日を表示'],
    'addons.region': ['Region', '地区', '地區', '地域'],
    'addons.regionTimeZone': ['Region time zone', '地区时区', '地區時區', '地域のタイムゾーン'],
    'addons.showRegion': ['Show region name', '显示地区名称', '顯示地區名稱', '地域名を表示'],
    'addons.showRegionOnClock': ['Show region name on clock', '在时钟上显示地区名称', '在時鐘上顯示地區名稱', '時計に地域名を表示'],
    'addons.mode': ['Mode', '模式', '模式', 'モード'],
    'addons.timerMode': ['Timer mode', '计时器模式', '計時器模式', 'タイマーのモード'],
    'addons.countdown': ['Countdown', '倒计时', '倒數計時', 'カウントダウン'],
    'addons.stopwatch': ['Stopwatch', '正计时', '碼錶', 'ストップウォッチ'],
    'addons.minutes': ['Minutes', '分钟', '分鐘', '分'],
    'addons.countdownMinutes': ['Countdown minutes', '倒计时分钟数', '倒數計時分鐘數', 'カウントダウンの分数'],
    'addons.pauseBeforeChange': ['Pause the timer before changing its mode or duration.', '更改模式或时长前请暂停计时器。', '變更模式或時間長度前請暫停計時器。', 'モードや時間を変更する前にタイマーを一時停止してください。'],
    'addons.pause': ['Pause', '暂停', '暫停', '一時停止'],
    'addons.start': ['Start', '开始', '開始', '開始'],
    'addons.reset': ['Reset', '重置', '重設', 'リセット'],
    'addons.up': ['Up', '上移', '上移', '上へ'],
    'addons.down': ['Down', '下移', '下移', '下へ'],
    'addons.moveUp': ['Move {name} up', '上移{name}', '上移{name}', '{name}を上へ移動'],
    'addons.moveDown': ['Move {name} down', '下移{name}', '下移{name}', '{name}を下へ移動'],
    'addons.remove': ['Remove', '移除', '移除', '削除'],
    'addons.removeName': ['Remove {name}', '移除{name}', '移除{name}', '{name}を削除'],
    'addons.resetToSwitch': ['Reset timer to switch?', '重置计时器后切换？', '重設計時器後切換？', 'タイマーをリセットして切り替えますか？'],
    'addons.resetWarning': ['Changing the timer mode or duration will clear the current session.', '更改计时器模式或时长会清除当前计时。', '變更計時器模式或時間長度會清除目前計時。', 'タイマーのモードや時間を変えると、現在の記録が消去されます。'],
    'addons.dontShowAgain': ["Don't show this again", '不再显示', '不再顯示', '今後表示しない'],
    'addons.cancel': ['Cancel', '取消', '取消', 'キャンセル'],
    'addons.resetAndChange': ['Reset and change', '重置并更改', '重設並變更', 'リセットして変更'],
    'addons.invalidRegion': ['Invalid region', '无效地区', '無效地區', '無効な地域'],
    'shortcuts.section': ['SHORTCUTS / 03', '快捷键 / 03', '快速鍵 / 03', 'ショートカット / 03'],
    'shortcuts.title': ['Control at your fingertips', '指尖掌控', '指尖掌控', '指先で操作'],
    'shortcuts.description': ['Action shortcuts work system-wide when switched on. They start off; the interaction modifier stays active. Unavailable combinations are shown below.', '启用后，操作快捷键可在系统范围内使用。默认关闭；交互修饰键始终有效。无法使用的组合会显示在下方。', '啟用後，操作快速鍵可在系統範圍內使用。預設關閉；互動修飾鍵持續有效。無法使用的組合會顯示在下方。', '操作用ショートカットを有効にすると、システム全体で使えます。初期状態では無効ですが、操作用の修飾キーは常に有効です。使えない組み合わせは下に表示されます。'],
    'shortcuts.unavailable': ['System-wide shortcut unavailable', '系统快捷键不可用', '系統快速鍵無法使用', 'システム全体のショートカットを使えません'],
    'shortcuts.conflict': ['Shortcut conflict detected', '检测到快捷键冲突', '偵測到快速鍵衝突', 'ショートカットの競合を検出'],
    'shortcuts.conflictDescription': ['Multiple actions share the same key combination. Conflicting shortcuts are highlighted below.', '多个操作使用了相同的组合键。冲突的快捷键会在下方突出显示。', '多個操作使用相同的組合鍵。衝突的快速鍵會在下方醒目顯示。', '複数の操作に同じキーが割り当てられています。競合するショートカットを下に表示します。'],
    'shortcuts.timerEnabled': ['TIMER: ENABLED', '计时器：已启用', '計時器：已啟用', 'タイマー: 有効'],
    'shortcuts.timerDisabled': ['TIMER: DISABLED', '计时器：已禁用', '計時器：已停用', 'タイマー: 無効'],
    'shortcuts.modifier': ['Interaction Modifier', '交互修饰键', '互動修飾鍵', '操作用の修飾キー'],
    'shortcuts.modifierDescription': ['Hold this modifier to move or right-click the transparent clock', '按住此键可移动透明时钟或对其右键单击', '按住此鍵可移動透明時鐘或按右鍵', 'このキーを押しながら、透明な時計を移動または右クリックします'],
    'shortcuts.enableTimerFirst': ['Enable the Timer add-on in the Add-ons tab to configure this shortcut', '请先在附加功能选项卡中启用计时器', '請先在附加功能分頁中啟用計時器', 'このショートカットを設定するにはアドオンでタイマーを有効にしてください'],
    'shortcuts.alsoAssigned': ['⚠️ Conflict: Also assigned to {name}', '⚠️ 冲突：也分配给{name}', '⚠️ 衝突：也指派給{name}', '⚠️ 競合: {name} にも割り当て済み'],
    'shortcuts.pressKeys': ['Press keys (Esc to cancel)...', '按下按键（Esc 取消）…', '按下按鍵（Esc 取消）…', 'キーを押してください（Esc でキャンセル）…'],
    'shortcuts.none': ['None', '无', '無', 'なし'],
    'shortcuts.turnOffToChange': ['Turn off this shortcut before changing it', '更改前请先关闭此快捷键', '變更前請先關閉此快速鍵', '変更する前にこのショートカットを無効にしてください'],
    'shortcuts.turnOffToClear': ['Turn off before clearing', '清除前请先关闭', '清除前請先關閉', '消去する前に無効にしてください'],
    'shortcuts.change': ['Change', '更改', '變更', '変更'],
    'shortcuts.clear': ['Clear', '清除', '清除', '消去'],
    'shortcuts.resetAll': ['Reset All Shortcuts to Default', '将所有快捷键恢复默认', '將所有快速鍵還原預設', 'すべてのショートカットを初期設定に戻す'],
    'shortcuts.coreTitle': ['TOPCLOCK DEFAULT SHORTCUTS', 'TOPCLOCK 默认快捷键', 'TOPCLOCK 預設快速鍵', 'TOPCLOCK の基本ショートカット'],
    'shortcuts.coreDescription': ['Core interactions for operating the desktop clock', '操作桌面时钟的基本快捷键', '操作桌面時鐘的基本快速鍵', 'デスクトップの時計を操作する基本キー'],
    'shortcuts.addonTitle': ['ADD-ON SHORTCUTS', '附加功能快捷键', '附加功能快速鍵', 'アドオンのショートカット'],
    'shortcuts.addonDescription': ['Dedicated shortcuts for add-ons. Only changeable when the respective add-on is enabled.', '附加功能专用快捷键。仅在相应功能启用时可更改。', '附加功能專用快速鍵。僅在對應功能啟用時可變更。', 'アドオン専用のショートカットです。対応するアドオンが有効な場合のみ変更できます。'],
    'shortcuts.openSettings': ['Open Settings', '打开设置', '開啟設定', '設定を開く'],
    'shortcuts.openSettingsDescription': ['Show settings window while clock is active', '时钟运行时显示设置窗口', '時鐘執行時顯示設定視窗', '時計の動作中に設定画面を表示'],
    'shortcuts.enableOpenSettings': ['Enable Open Settings shortcut', '启用打开设置快捷键', '啟用開啟設定快速鍵', '設定を開くショートカットを有効にする'],
    'shortcuts.quit': ['Quit TopClock', '結束 TopClock', '結束 TopClock', 'TopClock を終了'],
    'shortcuts.quitDescription': ['Exit application completely', '完全退出应用', '完全結束應用程式', 'アプリを完全に終了'],
    'shortcuts.enableQuit': ['Enable Quit shortcut', '启用退出快捷键', '啟用結束快速鍵', '終了ショートカットを有効にする'],
    'shortcuts.timerToggle': ['Timer Start / Stop', '计时器开始／暂停', '計時器開始／暫停', 'タイマーの開始／一時停止'],
    'shortcuts.timerToggleDescription': ['Start or pause the timer', '开始或暂停计时器', '開始或暫停計時器', 'タイマーを開始または一時停止'],
    'shortcuts.enableTimerToggle': ['Enable Timer Start or Pause shortcut', '启用计时器开始或暂停快捷键', '啟用計時器開始或暫停快速鍵', 'タイマーの開始・一時停止ショートカットを有効にする'],
    'shortcuts.timerReset': ['Timer Reset', '重置计时器', '重設計時器', 'タイマーのリセット'],
    'shortcuts.timerResetDescription': ['Reset the timer back to zero', '将计时器重置为零', '將計時器重設為零', 'タイマーをゼロに戻す'],
    'shortcuts.enableTimerReset': ['Enable Timer Reset shortcut', '启用重置计时器快捷键', '啟用重設計時器快速鍵', 'タイマーのリセットショートカットを有効にする'],
    'general.section': ['PREFERENCES / 04', '偏好设置 / 04', '偏好設定 / 04', '環境設定 / 04'],
    'general.title': ['Your clock, your way', '按你的方式使用时钟', '依你的方式使用時鐘', '時計を自分好みに'],
    'general.description': ['Choose how TopClock behaves on your PC.', '选择 TopClock 在电脑上的运行方式。', '選擇 TopClock 在電腦上的運作方式。', 'PC での TopClock の動作を設定します。'],
    'general.displays': ['Clocks on displays', '显示器上的时钟', '顯示器上的時鐘', 'ディスプレイごとの時計'],
    'general.displaysDescription': ['Choose where TopClock appears. Each display remembers its clock position.', '选择 TopClock 显示在哪些屏幕上。每台显示器会记住时钟位置。', '選擇 TopClock 顯示在哪些螢幕上。每台顯示器會記住時鐘位置。', 'TopClock を表示する画面を選びます。各ディスプレイで時計の位置を保存します。'],
    'general.mainDisplay': ['Main display', '主显示器', '主要顯示器', 'メインディスプレイ'],
    'general.connectedDisplay': ['Connected display', '已连接显示器', '已連接顯示器', '接続中のディスプレイ'],
    'general.showOnDisplay': ['Show clock on {name}', '在{name}上显示时钟', '在{name}上顯示時鐘', '{name}に時計を表示'],
    'general.display': ['Display', '显示器', '顯示器', 'ディスプレイ'],
    'general.displayNumber': ['Display {number}', '显示器 {number}', '顯示器 {number}', 'ディスプレイ {number}'],
    'general.sharedAppearance': ['Appearance and add-ons are shared across displays.', '所有显示器共用外观和附加功能。', '所有顯示器共用外觀和附加功能。', '外観とアドオンはすべてのディスプレイで共通です。'],
    'general.appBehavior': ['App behavior', '应用行为', '應用程式行為', 'アプリの動作'],
    'general.language': ['Language', '语言', '語言', '言語'],
    'general.languageDescription': ['Choose the language for TopClock and the date weekday.', '选择 TopClock 界面和日期星期的语言。', '選擇 TopClock 介面與日期星期的語言。', 'TopClock の画面と日付の曜日に使う言語を選びます。'],
    'general.system': ['System default', '跟随系统', '跟隨系統', 'システム設定に従う'],
    'general.launch': ['Launch when I sign in', '登录时启动', '登入時啟動', 'サインイン時に起動'],
    'general.launchDescription': ['Start the clock with Windows', '随 Windows 启动时钟', '隨 Windows 啟動時鐘', 'Windows と同時に時計を起動'],
    'general.autoUpdates': ['Automatically check for updates', '自动检查更新', '自動檢查更新', '更新を自動確認'],
    'general.autoUpdatesDescription': ['Check GitHub Releases when TopClock starts', 'TopClock 启动时检查 GitHub Releases', 'TopClock 啟動時檢查 GitHub Releases', 'TopClock の起動時に GitHub Releases を確認'],
    'general.settingsFiles': ['Settings files', '设置文件', '設定檔案', '設定ファイル'],
    'general.settingsFilesDescription': ['Open the folder containing settings.json', '打开包含 settings.json 的文件夹', '開啟包含 settings.json 的資料夾', 'settings.json があるフォルダーを開く'],
    'general.openFolder': ['Open folder', '打开文件夹', '開啟資料夾', 'フォルダーを開く'],
    'general.softwareUpdates': ['Software Updates', '软件更新', '軟體更新', 'ソフトウェアの更新'],
    'general.viewGithubRelease': ['View GitHub release ↗', '查看 GitHub 版本 ↗', '檢視 GitHub 版本 ↗', 'GitHub のリリースを見る ↗'],
    'general.checking': ['Checking…', '正在检查…', '正在檢查…', '確認中…'],
    'general.checkGithub': ['Check GitHub Releases', '检查 GitHub Releases', '檢查 GitHub Releases', 'GitHub Releases を確認'],
    'general.checkStore': ['Check Microsoft Store', '检查 Microsoft Store', '檢查 Microsoft Store', 'Microsoft Store を確認'],
    'general.installUpdate': ['Update', '更新', '更新', '更新'],
    'general.installingUpdate': ['Updating…', '正在更新…', '正在更新…', '更新中…'],
    'general.tip': ['TIP', '提示', '提示', 'ヒント'],
    'general.tipText': ['Hold {modifier} and drag the desktop clock to move it. {modifier} + click switches time format.', '按住 {modifier} 并拖动桌面时钟可移动它。{modifier} + 单击可切换时间格式。', '按住 {modifier} 並拖曳桌面時鐘可移動它。{modifier} + 點擊可切換時間格式。', '{modifier} キーを押しながら時計をドラッグすると移動できます。{modifier} + クリックで時刻表示を切り替えます。'],
    'updates.store': ['Updates are delivered through Microsoft Store', '更新通过 Microsoft Store 提供', '更新透過 Microsoft Store 提供', '更新は Microsoft Store から提供されます'],
    'updates.checkingStore': ['Checking Microsoft Store…', '正在检查 Microsoft Store…', '正在檢查 Microsoft Store…', 'Microsoft Store を確認中…'],
    'updates.storeAvailable': ['A Microsoft Store update is available.', 'Microsoft Store 中有可用更新。', 'Microsoft Store 中有可用更新。', 'Microsoft Store に更新があります。'],
    'updates.storeCheckFailed': ['Could not check Microsoft Store for updates.', '无法在 Microsoft Store 中检查更新。', '無法在 Microsoft Store 中檢查更新。', 'Microsoft Store で更新を確認できませんでした。'],
    'updates.storeInstalling': ['Microsoft Store is downloading and installing the update…', 'Microsoft Store 正在下载并安装更新…', 'Microsoft Store 正在下載並安裝更新…', 'Microsoft Store が更新をダウンロードしてインストールしています…'],
    'updates.storeInstalled': ['Update installed. Restart TopClock if needed.', '更新已安装。如有需要，请重新启动 TopClock。', '更新已安裝。如有需要，請重新啟動 TopClock。', '更新をインストールしました。必要に応じて TopClock を再起動してください。'],
    'updates.storeCanceled': ['Update canceled. You can try again.', '更新已取消。您可以重试。', '更新已取消。您可以重試。', '更新をキャンセルしました。再試行できます。'],
    'updates.storeInstallFailed': ['Microsoft Store could not install the update. Try again later.', 'Microsoft Store 无法安装更新。请稍后重试。', 'Microsoft Store 無法安裝更新。請稍後再試。', 'Microsoft Store で更新をインストールできませんでした。後でもう一度お試しください。'],
    'updates.currentVersion': ['GitHub Releases: Current version v{version}', 'GitHub Releases：当前版本 v{version}', 'GitHub Releases：目前版本 v{version}', 'GitHub Releases：現在のバージョン v{version}'],
    'updates.checkingGithub': ['Checking GitHub Releases…', '正在检查 GitHub Releases…', '正在檢查 GitHub Releases…', 'GitHub Releases を確認中…'],
    'updates.githubUpToDate': ['GitHub Releases: TopClock v{version} is up to date', 'GitHub Releases：TopClock v{version} 已是最新版本', 'GitHub Releases：TopClock v{version} 已是最新版本', 'GitHub Releases：TopClock v{version} は最新です'],
    'updates.storeUpToDate': ['Microsoft Store: TopClock v{version} is up to date', 'Microsoft Store：TopClock v{version} 已是最新版本', 'Microsoft Store：TopClock v{version} 已是最新版本', 'Microsoft Store：TopClock v{version} は最新です'],
    'updates.githubAvailable': ['New version {version} is on GitHub Releases.', 'GitHub Releases 上有新版本 {version}。', 'GitHub Releases 上有新版本 {version}。', '新しいバージョン {version} が GitHub Releases にあります。'],
    'updates.unreachable': ['Could not reach GitHub Releases (v{version})', '无法连接 GitHub Releases（v{version}）', '無法連接 GitHub Releases（v{version}）', 'GitHub Releases に接続できませんでした（v{version}）'],
    'error.save': ['Could not save settings: {error}', '无法保存设置：{error}', '無法儲存設定：{error}', '設定を保存できませんでした: {error}'],
    'error.displays': ['Could not list displays: {error}', '无法列出显示器：{error}', '無法列出顯示器：{error}', 'ディスプレイ一覧を取得できませんでした: {error}'],
    'error.fonts': ['Could not list installed fonts: {error}', '无法列出已安装字体：{error}', '無法列出已安裝字體：{error}', 'フォント一覧を取得できませんでした: {error}'],
    'error.startupRead': ['Could not read startup state: {error}', '无法读取启动状态：{error}', '無法讀取啟動狀態：{error}', '起動設定を読み取れませんでした: {error}'],
    'error.startupUpdate': ['Could not update startup: {error}', '无法更新启动设置：{error}', '無法更新啟動設定：{error}', '起動設定を更新できませんでした: {error}'],
    'error.openFolder': ['Could not open settings folder: {error}', '无法打开设置文件夹：{error}', '無法開啟設定資料夾：{error}', '設定フォルダーを開けませんでした: {error}'],
    'error.resetPositions': ['Could not reset clock positions: {error}', '无法重置时钟位置：{error}', '無法重設時鐘位置：{error}', '時計の位置をリセットできませんでした: {error}'],
    'error.displayVisibility': ['Could not change display visibility: {error}', '无法更改显示器可见性：{error}', '無法變更顯示器可見性：{error}', 'ディスプレイの表示設定を変更できませんでした: {error}'],
    'error.timer': ['Could not control timer: {error}', '无法控制计时器：{error}', '無法控制計時器：{error}', 'タイマーを操作できませんでした: {error}'],
    'error.shortcutEnabled': ['Turn off this shortcut before changing its keys.', '更改按键前请先关闭此快捷键。', '變更按鍵前請先關閉此快速鍵。', 'キーを変更する前にショートカットを無効にしてください。'],
    'error.shortcutKey': ['Choose Ctrl, Alt, or Shift plus a supported key for a system-wide shortcut.', '请选择 Ctrl、Alt 或 Shift 加一个支持的按键作为系统快捷键。', '請選擇 Ctrl、Alt 或 Shift 加上一個支援的按鍵作為系統快速鍵。', 'システム全体のショートカットには Ctrl、Alt、Shift のいずれかと対応するキーを選んでください。'],
};

const indexes = { en: 0, 'zh-Hans': 1, 'zh-Hant': 2, ja: 3 };
const keysByEnglish = new Map(Object.entries(messages).map(([key, row]) => [row[0], key]));
const originalText = new WeakMap();
const originalAttributes = new WeakMap();
let domLanguage = 'en';
let observer;
const weekdayFormatters = new Map();

export function resolveLanguage(preference = 'system', systemLocale = 'en') {
    const locale = (preference === 'system' ? systemLocale : preference).toLowerCase();
    if (locale.startsWith('ja')) return 'ja';
    if (locale.startsWith('zh')) {
        return /hant|^zh-(tw|hk|mo)(-|$)/.test(locale) ? 'zh-Hant' : 'zh-Hans';
    }
    return 'en';
}

export function translate(language, key, vars = {}) {
    const row = messages[key];
    if (!row) return key;
    const template = row[indexes[language] ?? 0] || row[0];
    return template.replace(/\{(\w+)\}/g, (_, name) => String(vars[name] ?? `{${name}}`));
}

// Translate static markup, including Alpine x-if/x-for clones. Dynamic x-text
// nodes are handled by the component so their values remain reactive.
function translateMarkup(root) {
    if (!root || typeof document === 'undefined') return;
    const elements = root.nodeType === Node.ELEMENT_NODE
        ? [root, ...root.querySelectorAll('*')]
        : [...root.querySelectorAll('*')];
    for (const element of elements) {
        let originals = originalAttributes.get(element);
        if (!originals) {
            originals = {};
            for (const name of ['title', 'aria-label', 'placeholder']) {
                if (element.hasAttribute(name) && !element.hasAttribute(`:${name}`)) originals[name] = element.getAttribute(name);
            }
            originalAttributes.set(element, originals);
        }
        for (const [name, english] of Object.entries(originals)) {
            const key = keysByEnglish.get(english);
            if (key) element.setAttribute(name, translate(domLanguage, key));
        }
    }
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
        const node = walker.currentNode;
        const parent = node.parentElement;
        if (!parent || parent.closest('[x-text], [x-html], script, style')) continue;
        const english = originalText.get(node) ?? node.nodeValue;
        if (!originalText.has(node)) originalText.set(node, english);
        const key = keysByEnglish.get(english.trim());
        if (key) node.nodeValue = english.replace(english.trim(), translate(domLanguage, key));
    }
}

export function localizeDocument(language) {
    if (typeof document === 'undefined') return;
    domLanguage = language;
    translateMarkup(document.documentElement);
    if (!observer) {
        observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (node.nodeType === Node.ELEMENT_NODE) translateMarkup(node);
                }
            }
        });
        observer.observe(document.documentElement, { childList: true, subtree: true });
    }
}

export function weekdayText(date, language) {
    const locale = { en: 'en-US', 'zh-Hans': 'zh-CN', 'zh-Hant': 'zh-TW', ja: 'ja-JP' }[language] || 'en-US';
    if (!weekdayFormatters.has(locale)) {
        weekdayFormatters.set(locale, new Intl.DateTimeFormat(locale, { weekday: 'short' }));
    }
    return `(${weekdayFormatters.get(locale).format(date)})`;
}

export const languageOptions = [
    { value: 'system', name: 'system' },
    { value: 'en', name: 'English' },
    { value: 'zh-Hans', name: '简体中文' },
    { value: 'zh-Hant', name: '繁體中文' },
    { value: 'ja', name: '日本語' },
];
