// 용어 사전.
//
// term 은 화면의 라벨·수식에 쓰인 표기와 정확히 같아야 한다. 그래야 본문에서
// 그 자리를 찾아 밑줄을 긋고 눌렀을 때 설명을 띄울 수 있다.
// aliases 에는 같은 뜻으로 쓰이는 다른 표기를 넣는다.

export const TERMS = [
  /* ---------- 렌즈 ---------- */
  {
    id: 'fov', term: 'FOV', en: 'Field of View', category: 'lens',
    aliases: ['시야'],
    short: '카메라 한 장에 담기는 대상 위의 실제 범위.',
    body: '센서에 맺힌 상이 대상 위에서 차지하는 크기입니다. 센서 크기를 배율로 나눈 값이며, 검사 대상이 이 안에 들어와야 합니다. 가로·세로를 따로 보고 둘 중 더 넓은 쪽을 요구하는 축이 렌즈 선정을 좌우합니다.',
    calc: 'lens-select', related: ['magnification', 'sensor-size', 'wd'],
  },
  {
    id: 'wd', term: 'WD', en: 'Working Distance', category: 'lens',
    aliases: ['작동거리'],
    short: '렌즈 앞면에서 검사 대상까지의 거리.',
    body: '렌즈를 대상에서 얼마나 띄울지를 말합니다. 조명이나 이송 기구가 들어갈 공간, 대상에 닿지 않을 여유를 함께 고려해 정합니다. 같은 렌즈라도 WD 를 바꾸면 FOV 와 배율이 함께 바뀝니다.',
    calc: 'lens-select', related: ['fov', 'focal-length', 'magnification'],
  },
  {
    id: 'focal-length', term: '초점거리', en: 'Focal Length', category: 'lens',
    short: '렌즈가 평행광을 한 점에 모으는 거리. 렌즈의 기본 사양입니다.',
    body: '렌즈에 25 mm, 50 mm 처럼 적혀 있는 값입니다. 짧을수록 넓게 보고 길수록 좁게 봅니다. 렌즈에서 센서까지의 거리와 혼동하기 쉬운데, 그 거리는 상거리이고 초점거리보다 조금 깁니다.',
    calc: 'lens-select', related: ['image-distance', 'fov', 'magnification'],
  },
  {
    id: 'image-distance', term: '상거리', en: 'Image Distance', category: 'lens',
    short: '렌즈에서 상이 맺히는 센서면까지의 거리.',
    body: '초점거리 × (1 + 배율) 입니다. 저배율에서는 초점거리와 비슷해 헷갈리지만 같은 값이 아닙니다. 등배(1:1)에서는 초점거리의 두 배가 됩니다.',
    calc: 'thin-lens', related: ['focal-length', 'magnification'],
  },
  {
    id: 'magnification', term: '배율', en: 'Magnification', category: 'lens',
    short: '대상이 센서 위에 얼마나 크게 맺히는지의 비.',
    body: '센서 크기를 FOV 로 나눈 값입니다. 0.2 배면 대상이 센서 위에서 1/5 크기로 맺힙니다. 1 배(등배)면 대상과 상이 같은 크기이고, 이때 WD 와 상거리가 모두 초점거리의 두 배가 됩니다.',
    calc: 'lens-select', related: ['fov', 'sensor-size', 'spatial-resolution'],
  },
  {
    id: 'sensor-size', term: '센서 크기', en: 'Sensor Size', category: 'camera',
    short: '센서의 물리적 가로·세로 치수.',
    body: '화소수 × 센서 픽셀 크기로 구합니다. 1/2", 2/3" 같은 포맷 표기보다 이 계산이 정확합니다. 렌즈의 이미지 서클이 이 센서의 대각보다 커야 모서리까지 덮습니다.',
    calc: 'sensor-format', related: ['pixel-pitch', 'image-circle', 'pixel-count'],
  },
  {
    id: 'dof', term: 'DOF', en: 'Depth of Field', category: 'lens',
    aliases: ['피사계심도'],
    short: '대상이 앞뒤로 움직여도 초점이 맞은 것으로 보이는 범위.',
    body: '대상 쪽에서 잰 허용 범위입니다. 조리개를 조일수록(F수를 키울수록) 깊어지지만 회절 때문에 해상력이 떨어지므로 무한정 조일 수는 없습니다. 대상의 두께나 이송 중 흔들림이 이 범위 안에 들어와야 합니다.',
    calc: 'dof', related: ['depth-of-focus', 'coc', 'f-number', 'airy'],
  },
  {
    id: 'depth-of-focus', term: '초점심도', en: 'Depth of Focus', category: 'lens',
    short: '센서를 앞뒤로 옮겨도 초점이 유지되는 범위.',
    body: 'DOF 가 대상 쪽 여유라면 초점심도는 센서 쪽 여유입니다. 두 값은 배율의 제곱으로 이어져 있습니다(초점심도 = DOF × 배율²). 카메라 마운트 공차나 온도에 의한 변형이 이 범위를 넘으면 초점이 틀어집니다.',
    calc: 'focus-depth', related: ['dof', 'coc', 'effective-f'],
  },
  {
    id: 'coc', term: 'CoC', en: 'Circle of Confusion', category: 'lens',
    aliases: ['허용 착란원', '착란원'],
    short: '점이 번져도 아직 점으로 봐주는 흐림의 지름.',
    body: '초점이 정확히 맞지 않으면 한 점이 작은 원으로 번집니다. 이 원이 얼마나 커질 때까지 허용할지가 CoC 이고, 그 기준이 DOF 를 정합니다. 머신비전에서는 센서 픽셀 크기의 1~2 배로 잡는 것이 관례입니다.',
    calc: 'dof', related: ['dof', 'depth-of-focus', 'pixel-pitch'],
  },
  {
    id: 'f-number', term: 'F수', en: 'F-number', category: 'lens',
    short: '조리개가 얼마나 열려 있는지를 나타내는 값. 클수록 조인 상태입니다.',
    body: '초점거리를 조리개 지름으로 나눈 값입니다. 값이 커지면 어두워지는 대신 DOF 가 깊어집니다. 다만 너무 조이면 회절 때문에 해상력이 떨어지므로, 에어리 디스크가 픽셀보다 커지기 전까지가 한계입니다.',
    calc: 'aperture', related: ['effective-f', 'dof', 'airy', 'na'],
  },
  {
    id: 'effective-f', term: '유효 F수', en: 'Effective F-number', category: 'lens',
    short: '근접 촬영에서 실제로 작용하는 F수. F수 × (1 + 배율) 입니다.',
    body: '대상을 가까이서 찍을수록 렌즈가 실질적으로 더 어두워집니다. 배율 1 배면 유효 F수가 두 배가 되어 2 스톱 어두워집니다. 회절과 심도 계산에는 표기된 F수가 아니라 이 값을 써야 합니다.',
    calc: 'aperture', related: ['f-number', 'airy', 'depth-of-focus'],
  },
  {
    id: 'airy', term: '에어리 디스크', en: 'Airy Disk', category: 'lens',
    aliases: ['회절 스팟', '에어리 지름'],
    short: '회절 때문에 한 점이 번져 생기는 최소 크기의 원.',
    body: '렌즈가 아무리 좋아도 빛의 파동성 때문에 점을 점으로 맺을 수 없습니다. 조리개를 조일수록 이 원이 커집니다. 지름이 센서 픽셀보다 커지면 해상력이 픽셀이 아니라 회절에 묶이므로, 더 조여도 화질만 나빠집니다.',
    calc: 'aperture', related: ['f-number', 'effective-f', 'pixel-pitch'],
  },
  {
    id: 'na', term: 'NA', en: 'Numerical Aperture', category: 'lens',
    aliases: ['개구수'],
    short: '렌즈가 빛을 얼마나 넓은 각도로 받아들이는지.',
    body: '값이 클수록 밝고 분해능이 높습니다. 상측 NA 는 유효 F수의 역수를 2 로 나눈 값입니다. 현미경 대물렌즈는 F수 대신 이 값으로 표기하는 것이 보통입니다.',
    calc: 'aperture', related: ['f-number', 'effective-f'],
  },
  {
    id: 'image-circle', term: '이미지 서클', en: 'Image Circle', category: 'lens',
    short: '렌즈가 상을 제대로 맺어주는 원의 지름.',
    body: '렌즈 스펙시트에 적힌 값입니다. 이 원이 센서 대각보다 작으면 모서리가 어둡거나 잘립니다. 스펙상 딱 맞더라도 가장자리는 해상력과 밝기가 떨어지므로 여유를 두는 것이 좋습니다.',
    calc: 'image-circle', related: ['vignetting', 'sensor-size'],
  },
  {
    id: 'vignetting', term: '비네팅', en: 'Vignetting', category: 'lens',
    short: '화면 모서리가 중심보다 어두워지는 현상.',
    body: '렌즈의 이미지 서클이 센서를 다 덮지 못하거나, 조명이 시야 가장자리까지 닿지 않을 때 생깁니다. 검사에서는 모서리 부분의 밝기 기준이 달라져 오검출로 이어집니다.',
    calc: 'image-circle', related: ['image-circle', 'coverage'],
  },
  {
    id: 'telecentric', term: '텔레센트릭', en: 'Telecentric', category: 'geometry',
    short: '대상이 앞뒤로 움직여도 크기가 거의 변하지 않는 렌즈.',
    body: '일반 렌즈는 대상이 가까워지면 크게 찍혀 치수 측정에 오차가 생깁니다. 텔레센트릭 렌즈는 주광선을 광축과 나란하게 만들어 이 변화를 없앱니다. 대신 렌즈 지름이 대상보다 커야 해서 크고 비쌉니다.',
    calc: 'telecentric', related: ['perspective', 'telecentricity'],
  },
  {
    id: 'telecentricity', term: '텔레센트릭도', en: 'Telecentricity', category: 'geometry',
    short: '텔레센트릭 렌즈에 남아 있는 각도 오차. 작을수록 좋습니다.',
    body: '완전한 텔레센트릭은 없어서 보통 0.05~0.5° 의 잔여 각도가 남습니다. 대상 높이가 변하면 이 각도만큼 측정 오차가 생깁니다. 스펙시트의 Telecentricity 항목이 이 값입니다.',
    calc: 'telecentric', related: ['telecentric', 'perspective'],
  },
  {
    id: 'perspective', term: '원근 오차', en: 'Perspective Error', category: 'geometry',
    short: '대상 높이가 달라지면 크기가 다르게 찍히는 오차.',
    body: '일반 렌즈에서는 가까운 것이 크게 찍힙니다. 두께가 있는 대상을 재면 윗면과 아랫면의 크기가 달라집니다. WD 를 늘리거나 텔레센트릭 렌즈를 쓰면 줄어듭니다.',
    calc: 'perspective-error', related: ['telecentric', 'wd'],
  },
  {
    id: 'bfd', term: 'BFD', en: 'Back Focal Distance', category: 'lens',
    aliases: ['후초점거리'],
    short: '마지막 렌즈면에서 초점이 맺히는 곳까지의 거리.',
    body: '센서를 놓을 수 있는 자리를 정합니다. 렌즈를 조합할 때 이 값이 음수가 되면 초점이 렌즈 안쪽에 맺혀 센서를 둘 수 없습니다.',
    calc: 'lens-combination', related: ['focal-length', 'image-distance'],
  },
  {
    id: 'extension-tube', term: '익스텐션 튜브', en: 'Extension Tube', category: 'lens',
    aliases: ['접사링'],
    short: '렌즈와 카메라 사이에 끼워 배율을 올리는 링.',
    body: '렌즈를 센서에서 떨어뜨려 더 가까운 대상에 초점이 맞게 합니다. 배율이 튜브 길이 / 초점거리만큼 올라가는 대신 WD 가 짧아지고 어두워집니다. 광학계를 추가하지 않아 화질 손실이 적습니다.',
    calc: 'extension-tube', related: ['magnification', 'effective-f'],
  },

  /* ---------- 카메라 · 센서 ---------- */
  {
    id: 'pixel-pitch', term: '센서 픽셀 크기', en: 'Pixel Pitch', category: 'camera',
    aliases: ['픽셀 피치'],
    short: '센서 위 픽셀 하나의 물리적 크기. 보통 3~5 µm 입니다.',
    body: '카메라 스펙시트에 적힌 값입니다. 대상 위에서 픽셀이 차지하는 크기(대상 분해능)와 이름이 비슷해 헷갈리기 쉬운데, 둘은 배율만큼 차이 납니다. 픽셀이 작을수록 회절 한계에 쉽게 걸립니다.',
    calc: 'sensor-format', related: ['spatial-resolution', 'sensor-size', 'airy'],
  },
  {
    id: 'spatial-resolution', term: '대상 분해능', en: 'Spatial Resolution', category: 'camera',
    aliases: ['이미지 분해능', '축척'],
    short: '대상 위에서 픽셀 하나가 차지하는 실제 크기(µm/px).',
    body: '센서 픽셀 크기를 배율로 나눈 값이자, FOV 를 화소수로 나눈 값입니다. 캘리브레이션에서 기준 물체의 실측값을 픽셀수로 나눠 구하는 값도 같은 값이며, mm/px 로 쓰면 축척이라고 부르기도 합니다. 이 값이 검사 정밀도를 결정합니다.',
    calc: 'resolution', related: ['pixel-pitch', 'nyquist', 'fov'],
  },
  {
    id: 'pixel-count', term: '화소수', en: 'Pixel Count', category: 'camera',
    short: '센서의 가로·세로 픽셀 개수.',
    body: '5120 × 5120 처럼 적습니다. 화소수가 많으면 같은 FOV 에서 더 세밀하게 볼 수 있지만 데이터가 늘어 프레임레이트가 떨어집니다.',
    calc: 'sensor-format', related: ['sensor-size', 'data-rate'],
  },
  {
    id: 'nyquist', term: '나이퀴스트', en: 'Nyquist Limit', category: 'camera',
    short: '신호를 구분하려면 최소 두 픽셀이 필요하다는 한계.',
    body: '한 픽셀보다 작은 결함은 있는지 없는지조차 알 수 없고, 두 픽셀이라야 겨우 존재를 압니다. 실제 검사에서는 안정적인 판정을 위해 3~5 픽셀을 확보합니다.',
    calc: 'resolution', related: ['spatial-resolution'],
  },
  {
    id: 'data-rate', term: '데이터 레이트', en: 'Data Rate', category: 'camera',
    short: '카메라가 초당 내보내는 데이터의 양(MB/s).',
    body: '화소수 × 비트 깊이 × 프레임레이트로 정해집니다. 인터페이스 대역폭을 넘으면 프레임이 빠지므로, 링크 용량 안에서 프레임레이트가 결정됩니다. GigE 는 약 115 MB/s, 10GigE 는 약 1150 MB/s 입니다.',
    calc: 'data-rate', related: ['pixel-count', 'bit-depth'],
  },
  {
    id: 'bit-depth', term: '비트 깊이', en: 'Bit Depth', category: 'camera',
    short: '픽셀 하나의 밝기를 몇 단계로 나눠 표현하는지.',
    body: '8 bit 는 256 단계, 12 bit 는 4096 단계입니다. 단계가 많으면 어두운 부분의 정보가 살아나지만 데이터가 그만큼 늘어납니다. 센서의 다이나믹 레인지보다 지나치게 높은 비트는 낭비입니다.',
    calc: 'dynamic-range', related: ['dr', 'data-rate'],
  },
  {
    id: 'motion-blur', term: '모션 블러', en: 'Motion Blur', category: 'camera',
    aliases: ['블러'],
    short: '노출 중 대상이 움직여 상이 번지는 현상.',
    body: '이송 속도 × 노출 시간만큼 상이 흐릅니다. 이 거리가 한 픽셀을 넘으면 에지가 뭉개져 측정이 부정확해집니다. 노출을 줄이거나 조명을 밝히거나 스트로브를 써서 잡습니다.',
    calc: 'motion-blur', related: ['exposure', 'spatial-resolution', 'strobe'],
  },
  {
    id: 'exposure', term: '노출 시간', en: 'Exposure Time', category: 'camera',
    short: '센서가 빛을 받아들이는 시간.',
    body: '길수록 밝지만 움직이는 대상은 번집니다. 짧게 하려면 조명을 밝히거나 게인을 올려야 하는데, 게인은 잡음도 함께 키웁니다.',
    calc: 'exposure-gain', related: ['motion-blur', 'gain', 'illuminance'],
  },
  {
    id: 'gain', term: '게인', en: 'Gain', category: 'camera',
    short: '센서 신호를 전자적으로 증폭하는 정도(dB).',
    body: '6 dB 마다 밝기가 두 배가 됩니다. 조명을 늘리지 않고 밝게 만들 수 있지만 잡음도 같이 커져 SNR 이 떨어집니다. 가능하면 조명으로 해결하는 편이 화질에 유리합니다.',
    calc: 'exposure-gain', related: ['snr', 'exposure'],
  },
  {
    id: 'snr', term: 'SNR', en: 'Signal-to-Noise Ratio', category: 'camera',
    short: '신호가 잡음보다 얼마나 큰지의 비(dB).',
    body: '값이 클수록 깨끗한 영상입니다. 밝은 곳에서는 빛 자체의 통계적 요동(샷 잡음)이 지배해 신호의 제곱근에 비례합니다. 그래서 노출을 절반으로 줄이면 SNR 이 3 dB 떨어집니다.',
    calc: 'dynamic-range', related: ['dr', 'gain', 'read-noise'],
  },
  {
    id: 'dr', term: 'DR', en: 'Dynamic Range', category: 'camera',
    aliases: ['다이나믹 레인지'],
    short: '가장 밝은 곳과 가장 어두운 곳을 동시에 담는 능력(dB).',
    body: '포화 전자수를 읽기 잡음으로 나눈 비입니다. 값이 크면 밝은 반사와 어두운 그림자를 한 장에 담을 수 있습니다. 필요한 비트 깊이도 이 값에서 정해집니다.',
    calc: 'dynamic-range', related: ['snr', 'full-well', 'read-noise', 'bit-depth'],
  },
  {
    id: 'full-well', term: '포화 전자수', en: 'Full Well Capacity', category: 'camera',
    short: '픽셀 하나가 담을 수 있는 최대 전자 수.',
    body: '이 수를 넘으면 더 밝아도 값이 오르지 않고 하얗게 날아갑니다. 클수록 다이나믹 레인지와 최대 SNR 이 좋아집니다.',
    calc: 'dynamic-range', related: ['dr', 'read-noise'],
  },
  {
    id: 'read-noise', term: '읽기 잡음', en: 'Read Noise', category: 'camera',
    short: '빛이 없어도 생기는 회로 자체의 잡음.',
    body: '어두운 쪽 한계를 정합니다. 작을수록 어두운 부분을 살릴 수 있습니다. 다이나믹 레인지의 분모가 되는 값입니다.',
    calc: 'dynamic-range', related: ['dr', 'full-well'],
  },
  {
    id: 'binning', term: '비닝', en: 'Binning', category: 'camera',
    short: '이웃한 픽셀을 묶어 하나로 읽는 기능.',
    body: '2×2 로 묶으면 감도가 4 배 오르고 데이터가 1/4 로 줄어 빨라집니다. 대신 실효 픽셀이 커져 분해능은 절반이 됩니다. 어둡고 빠른 검사에서 분해능을 양보할 때 씁니다.',
    calc: 'binning-roi', related: ['roi', 'pixel-pitch'],
  },
  {
    id: 'roi', term: 'ROI', en: 'Region of Interest', category: 'camera',
    short: '센서 전체가 아니라 필요한 영역만 읽는 설정.',
    body: '읽는 행 수가 줄면 그만큼 프레임레이트가 올라갑니다. 라인이 지나가는 부분만 보면 되는 검사에서 속도를 크게 올릴 수 있습니다.',
    calc: 'binning-roi', related: ['binning', 'data-rate'],
  },
  {
    id: 'rolling-shutter', term: '롤링 셔터', en: 'Rolling Shutter', category: 'camera',
    short: '센서를 위에서 아래로 순차 노출하는 방식.',
    body: '모든 행이 동시에 찍히지 않아 움직이는 대상이 기울어져 보입니다. 치수 측정에는 부적합하며, 전체를 동시에 노출하는 글로벌 셔터를 씁니다.',
    calc: 'rolling-shutter', related: ['motion-blur'],
  },
  {
    id: 'line-rate', term: '라인레이트', en: 'Line Rate', category: 'camera',
    short: '라인스캔 카메라가 초당 찍는 라인 수.',
    body: '이송 속도를 이송방향 분해능으로 나눈 값입니다. 정사각 픽셀을 얻으려면 이송방향 분해능을 가로 분해능과 같게 맞춰야 합니다. 라인 주기가 곧 노출 시간의 상한이 됩니다.',
    calc: 'line-rate', related: ['spatial-resolution', 'divider'],
  },

  /* ---------- 조명 ---------- */
  {
    id: 'illuminance', term: '조도', en: 'Illuminance', category: 'lighting',
    short: '대상면이 받는 빛의 밝기(lux).',
    body: '광도를 거리의 제곱으로 나눈 값입니다. 조명을 두 배 멀리 두면 1/4 로 떨어집니다. 노출 시간과 함께 영상의 밝기를 정합니다.',
    calc: 'illuminance', related: ['inverse-square', 'stop', 'exposure'],
  },
  {
    id: 'inverse-square', term: '역제곱 법칙', en: 'Inverse Square Law', category: 'lighting',
    short: '조도가 거리의 제곱에 반비례한다는 법칙.',
    body: '점광원에서 나온 빛이 거리에 따라 넓게 퍼지기 때문입니다. 조명을 조금만 옮겨도 밝기가 크게 변하므로, 조명 위치는 고정해 두는 것이 좋습니다. 면조명은 가까운 거리에서 이보다 완만하게 떨어집니다.',
    calc: 'inverse-square', related: ['illuminance', 'stop'],
  },
  {
    id: 'stop', term: '스톱', en: 'Stop', category: 'lighting',
    aliases: ['노출 단계'],
    short: '밝기가 두 배 또는 절반이 되는 단위.',
    body: '1 스톱 밝아지면 밝기가 두 배입니다. 노출 시간, 조리개, 조명, 게인을 하나의 척도로 비교할 수 있어 설정을 맞바꿀 때 편합니다. 노출을 1 스톱 줄이면 조리개를 1 스톱 열어 상쇄할 수 있습니다.',
    calc: 'exposure-balance', related: ['f-number', 'exposure', 'gain'],
  },
  {
    id: 'strobe', term: '스트로브', en: 'Strobe', category: 'lighting',
    short: '아주 짧게 강하게 터뜨리는 조명.',
    body: '노출 시간만큼만 켜므로 순간적으로 정격보다 몇 배 밝게 쓸 수 있습니다. 고속 이송에서 모션 블러를 없애는 표준적인 방법입니다. 평균 부하가 정격을 넘으면 LED 수명이 급격히 줄어듭니다.',
    calc: 'strobe', related: ['duty', 'motion-blur'],
  },
  {
    id: 'duty', term: '듀티', en: 'Duty Cycle', category: 'lighting',
    aliases: ['허용 듀티'],
    short: '전체 주기 중 조명이 켜져 있는 시간의 비율.',
    body: '펄스 폭 × 반복 주파수입니다. 듀티가 낮을수록 더 세게 오버드라이브할 수 있습니다. 평균 부하(듀티 × 오버드라이브)를 정격 이내로 두는 것이 기준입니다.',
    calc: 'strobe', related: ['strobe'],
  },
  {
    id: 'coverage', term: '조사 영역', en: 'Coverage', category: 'lighting',
    short: '조명이 실제로 비추는 범위의 지름.',
    body: '발광부 크기에 퍼짐을 더한 값입니다. FOV 보다 넉넉히 커야 합니다. 조명 가장자리는 광량이 급격히 떨어져 균일도가 나빠지기 때문입니다.',
    calc: 'light-coverage', related: ['vignetting', 'fov'],
  },

  /* ---------- 기하 ---------- */
  {
    id: 'aov', term: '화각', en: 'Angle of View', category: 'geometry',
    short: '렌즈가 담는 범위를 각도로 나타낸 값.',
    body: 'FOV 가 작동거리에서 이루는 각입니다. 카탈로그의 화각은 무한원 초점 기준이라, 가까이서 찍는 검사에서는 실제 화각이 그보다 좁습니다.',
    calc: 'angle-of-view', related: ['fov', 'focal-length', 'wd'],
  },
  {
    id: 'calibration', term: '캘리브레이션', en: 'Calibration', category: 'geometry',
    short: '픽셀 수를 실제 치수로 바꾸는 기준을 정하는 일.',
    body: '치수를 아는 타깃을 찍어 몇 픽셀인지 세면 대상 분해능(mm/px)이 나옵니다. 기준 물체가 클수록 정확해지므로 FOV 를 가로지르는 큰 타깃을 씁니다.',
    calc: 'pixel-calibration', related: ['spatial-resolution', 'uncertainty', 'keystone'],
  },
  {
    id: 'keystone', term: '키스톤', en: 'Keystone', category: 'geometry',
    short: '카메라가 기울어져 사각형이 사다리꼴로 찍히는 왜곡.',
    body: '광축이 대상면에 수직이 아니면 한쪽이 가깝고 반대쪽이 멀어져 배율이 달라집니다. 치수 측정에 쓰려면 설치를 다시 잡거나 소프트웨어로 보정해야 합니다.',
    calc: 'camera-tilt', related: ['perspective', 'dof'],
  },

  /* ---------- 파동 · 재료 ---------- */
  {
    id: 'refractive-index', term: '굴절률', en: 'Refractive Index', category: 'wave',
    short: '매질 안에서 빛이 얼마나 느려지는지를 나타내는 값.',
    body: '공기 1.0, 물 1.333, 일반 유리 1.52 입니다. 매질이 바뀌는 경계에서 빛이 꺾이는 정도와 반사되는 양을 정합니다.',
    calc: 'snell', related: ['snell', 'critical-angle', 'plate'],
  },
  {
    id: 'snell', term: '스넬 법칙', en: "Snell's Law", category: 'wave',
    short: '경계면에서 빛이 꺾이는 각도를 정하는 법칙.',
    body: '굴절률 × sin(각도) 가 경계 양쪽에서 같습니다. 굴절률이 큰 쪽으로 들어갈 때는 법선 쪽으로 꺾입니다.',
    calc: 'snell', related: ['refractive-index', 'critical-angle', 'fresnel'],
  },
  {
    id: 'critical-angle', term: '임계각', en: 'Critical Angle', category: 'wave',
    short: '이 각을 넘으면 빛이 전부 되돌아오는 각도.',
    body: '굴절률이 큰 쪽에서 작은 쪽으로 나갈 때만 생깁니다. 유리 안으로 빛을 가둬 내부 결함만 밝게 띄우는 도광 조명이 이 원리를 씁니다.',
    calc: 'critical-angle', related: ['snell', 'refractive-index'],
  },
  {
    id: 'fresnel', term: '프레넬', en: 'Fresnel Reflection', category: 'wave',
    aliases: ['반사율'],
    short: '경계면에서 되돌아오는 빛의 비율.',
    body: '공기와 유리 사이는 수직 입사에서 약 4 % 가 반사됩니다. 유리는 앞뒤 두 면이 있어 8 % 가량 잃습니다. 이 반사광이 검사 화면에 번들거림으로 나타납니다.',
    calc: 'snell', related: ['snell', 'plate', 'brewster'],
  },
  {
    id: 'brewster', term: '브루스터각', en: 'Brewster Angle', category: 'wave',
    short: '한쪽 편광의 반사가 사라지는 입사 각도.',
    body: '이 각도로 비추고 편광판을 쓰면 표면 반사를 거의 없앨 수 있습니다. 유리나 금속 표면의 번들거림을 잡는 데 씁니다.',
    calc: 'critical-angle', related: ['fresnel', 'snell'],
  },
  {
    id: 'plate', term: '평행판', en: 'Plane Parallel Plate', category: 'wave',
    short: '앞뒤가 나란한 유리판. 커버 글라스나 검사 대상 유리입니다.',
    body: '유리를 통해 들여다보면 초점이 두께 × (1 − 1/굴절률) 만큼 뒤로 밀립니다. 3 mm 유리면 약 1 mm 입니다. 이 값이 DOF 안에 들어오는지 확인해야 합니다.',
    calc: 'plane-plate', related: ['refractive-index', 'dof', 'fresnel'],
  },

  /* ---------- 엔코더 · 트리거 ---------- */
  {
    id: 'encoder-resolution', term: '엔코더 분해능', en: 'Encoder Resolution', category: 'encoder',
    short: '엔코더 펄스 하나가 나타내는 이송 거리(µm).',
    body: '이동 거리를 그동안 센 펄스 수로 나누면 나옵니다. 로터리 엔코더는 롤러 둘레를 1회전당 펄스 수로 나눕니다. 이 값이 이미지 분해능과 어떤 비인지가 분주비를 정합니다.',
    calc: 'encoder-resolution', related: ['divider', 'ppr', 'scaler'],
  },
  {
    id: 'divider', term: '분주비', en: 'Divider', category: 'encoder',
    short: '엔코더 펄스를 몇 개마다 한 번 촬상할지.',
    body: '이미지 분해능을 엔코더 분해능으로 나눈 값입니다. 트리거 보드에는 정수만 넣을 수 있어 반내림하거나 반올림해야 하고, 그만큼 Y 방향 분해능이 목표에서 벗어납니다. 이 차이가 크면 상이 늘어나거나 눌립니다.',
    calc: 'trigger-divider', related: ['encoder-resolution', 'spatial-resolution', 'line-rate'],
  },
  {
    id: 'ppr', term: 'PPR', en: 'Pulses per Revolution', category: 'encoder',
    short: '로터리 엔코더가 1회전에 내는 펄스 수.',
    body: '5000 PPR 이 흔합니다. A/B 상을 모두 세는 4체배를 쓰면 실제로는 20000 펄스가 됩니다. 값이 클수록 이송을 세밀하게 나눌 수 있습니다.',
    calc: 'encoder-resolution', related: ['encoder-resolution', 'multiplier'],
  },
  {
    id: 'multiplier', term: '체배', en: 'Multiplier', category: 'encoder',
    short: 'A/B 상의 변화를 몇 번 세는지. 보통 4체배입니다.',
    body: 'A상과 B상 각각의 상승·하강을 모두 세면 4배가 됩니다. 엔코더를 바꾸지 않고 분해능을 네 배로 올리는 방법입니다.',
    calc: 'encoder-resolution', related: ['ppr', 'encoder-resolution'],
  },
  {
    id: 'scaler', term: '스케일러', en: 'Scaler', category: 'encoder',
    short: '엔코더 분해능을 이미지 분해능으로 나눈 비.',
    body: '엔코더 한 펄스가 픽셀보다 굵을 때 씁니다. 값이 10 이면 펄스마다 찍었을 때 Y 방향이 10 배 늘어난다는 뜻이라, 그랩보드 쪽에서 보정하거나 더 조밀한 엔코더가 필요합니다.',
    calc: 'encoder-resolution', related: ['encoder-resolution', 'divider'],
  },
  {
    id: 'pulse-width', term: '트리거 펄스폭', en: 'Trigger Pulse Width', category: 'encoder',
    aliases: ['펄스폭', '펄스 폭'],
    short: '트리거 신호가 켜져 있는 시간.',
    body: '다음 엔코더 펄스가 오기 전에 끝나야 하므로 엔코더 주기에서 여유를 뺀 값으로 잡습니다. 트리거 보드에는 시간이 아니라 타이머 눈금 개수로 넣으므로, 폭을 보드의 분해능(예: 20 ns)으로 나눈 정수를 설정합니다.',
    calc: 'trigger-divider', related: ['divider', 'encoder-resolution'],
  },

  /* ---------- 값·설정 용어 ---------- */
  // 결과 카드와 입력 칸에 자주 나오지만 이름만으로는 뜻이 잡히지 않는 것들.
  {
    id: 'luminous-intensity', term: '광도', en: 'Luminous Intensity', category: 'lighting',
    short: '조명이 한 방향으로 내보내는 빛의 세기(cd).',
    body: '조명 스펙시트의 candela 값입니다. 거리와 무관한 조명 자체의 성질이고, 여기에 거리를 반영하면 대상면이 받는 조도가 나옵니다.',
    calc: 'illuminance', related: ['illuminance', 'luminous-flux', 'solid-angle'],
  },
  {
    id: 'luminous-flux', term: '광속', en: 'Luminous Flux', category: 'lighting',
    short: '조명이 사방으로 내보내는 빛의 총량(lm).',
    body: '광도에 빛이 퍼지는 입체각을 곱한 값입니다. 같은 광속이라도 좁게 모으면 밝고 넓게 퍼뜨리면 어두워집니다.',
    calc: 'illuminance', related: ['luminous-intensity', 'solid-angle', 'illuminance'],
  },
  {
    id: 'solid-angle', term: '입체각', en: 'Solid Angle', category: 'lighting',
    short: '빛이 퍼져 나가는 원뿔의 넓이를 나타내는 각(sr).',
    body: '평면의 각도를 입체로 확장한 개념입니다. 사방 전체가 4π sr 이고 반각이 좁을수록 작아집니다. 광도와 광속을 잇는 다리 역할을 합니다.',
    calc: 'illuminance', related: ['luminous-flux', 'half-angle'],
  },
  {
    id: 'half-angle', term: '조명 반각', en: 'Half Angle', category: 'lighting',
    short: '조명 빔이 퍼지는 각도의 절반.',
    body: '전체 퍼짐각이 60° 면 반각은 30° 입니다. 좁을수록 같은 광속으로 더 밝게 비출 수 있지만 조사 범위가 줄어듭니다.',
    calc: 'light-coverage', related: ['coverage', 'beam-diameter', 'solid-angle'],
  },
  {
    id: 'beam-diameter', term: '조사 지름', en: 'Beam Diameter', category: 'lighting',
    short: '조명이 대상면에 실제로 비추는 원의 지름.',
    body: '발광부 크기에 거리만큼의 퍼짐을 더한 값입니다. FOV 보다 넉넉히 커야 가장자리까지 균일하게 밝습니다.',
    calc: 'light-coverage', related: ['coverage', 'half-angle', 'edge-falloff'],
  },
  {
    id: 'brightness-ratio', term: '밝기 배수', en: 'Brightness Ratio', category: 'lighting',
    short: '조건을 바꿨을 때 밝기가 몇 배가 되는지.',
    body: '2 면 두 배 밝고 0.5 면 절반입니다. 스톱으로 환산하면 log₂ 를 취한 값이라 2 배가 1 스톱입니다. 노출·조리개·조명·게인을 한 척도로 비교할 때 씁니다.',
    calc: 'exposure-balance', related: ['stop', 'inverse-square', 'illuminance'],
  },
  {
    id: 'average-load', term: '평균 부하', en: 'Average Load', category: 'lighting',
    aliases: ['권장 평균 부하', '그때의 평균 부하'],
    short: 'LED 가 정격 대비 평균 몇 배로 일하고 있는지.',
    body: '듀티 × 오버드라이브 배수입니다. 1 을 넘으면 정격을 초과해 발열이 쌓이고 수명이 급격히 줄어듭니다. 짧게 터뜨릴수록 평균이 낮게 유지되므로 더 세게 몰아칠 수 있습니다.',
    calc: 'strobe', related: ['duty', 'overdrive', 'strobe'],
  },
  {
    id: 'overdrive', term: '오버드라이브', en: 'Overdrive', category: 'lighting',
    aliases: ['필요 오버드라이브', '듀티 기준 허용 배수'],
    short: '정격보다 큰 전류를 순간적으로 흘려 더 밝게 쓰는 것.',
    body: '스트로브 컨트롤러가 하는 일입니다. 짧게만 켜므로 평균 전력은 정격 이내로 유지됩니다. 듀티의 역수가 이론적인 상한입니다.',
    calc: 'strobe', related: ['strobe', 'duty', 'average-load'],
  },
  {
    id: 'repetition-rate', term: '반복 주파수', en: 'Repetition Rate', category: 'lighting',
    aliases: ['반복 주기'],
    short: '조명을 초당 몇 번 터뜨리는지(Hz).',
    body: '보통 프레임레이트와 같게 맞춥니다. 그 역수가 반복 주기이고, 펄스 폭은 이 주기보다 짧아야 합니다.',
    calc: 'strobe', related: ['strobe', 'duty', 'fps'],
  },
  {
    id: 'edge-falloff', term: '가장자리 조도비', en: 'Edge Falloff', category: 'lighting',
    aliases: ['가장자리 손실'],
    short: '시야 끝의 밝기가 중심 대비 몇 % 인지.',
    body: '비스듬히 보이는 만큼 어두워지며 각도의 네제곱 코사인을 따릅니다. 70 % 아래로 떨어지면 검사 임계값을 위치별로 나눠야 할 수 있습니다. 조명을 멀리 두거나 확산판을 쓰면 완만해집니다.',
    calc: 'light-coverage', related: ['coverage', 'vignetting'],
  },

  {
    id: 'fps', term: 'fps', en: 'Frames per Second', category: 'camera',
    aliases: ['프레임레이트'],
    short: '초당 찍는 장 수.',
    body: '센서의 리드아웃 속도와 인터페이스 대역폭 중 낮은 쪽이 상한이 됩니다. ROI 로 읽는 행을 줄이거나 비닝을 쓰면 올라갑니다.',
    calc: 'data-rate', related: ['bandwidth', 'roi', 'readout'],
  },
  {
    id: 'bandwidth', term: '대역폭', en: 'Bandwidth', category: 'camera',
    short: '인터페이스가 초당 실어 나를 수 있는 데이터 양(MB/s).',
    body: 'GigE 약 115, USB3 약 350, 10GigE 약 1150, CXP-12 약 1200 MB/s 입니다. 카메라가 내는 데이터 레이트가 이 값을 넘으면 프레임이 빠집니다. 80 % 를 넘기면 여유가 없어 불안정해집니다.',
    calc: 'data-rate', related: ['data-rate', 'fps', 'pixel-rate'],
  },
  {
    id: 'pixel-rate', term: '픽셀 레이트', en: 'Pixel Rate', category: 'camera',
    short: '초당 처리되는 픽셀 수(Mpx/s).',
    body: '화소수 × 프레임레이트입니다. 비트 깊이와 무관한 값이라 센서의 순수한 처리 속도를 비교할 때 씁니다.',
    calc: 'data-rate', related: ['data-rate', 'fps'],
  },
  {
    id: 'readout', term: '리드아웃', en: 'Readout', category: 'camera',
    short: '센서에 쌓인 신호를 읽어 내보내는 과정과 그 시간.',
    body: '첫 행부터 마지막 행까지 걸리는 시간입니다. 롤링 셔터에서는 이 시간 동안 대상이 움직여 상이 기울어집니다.',
    calc: 'rolling-shutter', related: ['rolling-shutter', 'fps'],
  },
  {
    id: 'aspect-ratio', term: '종횡비', en: 'Aspect Ratio', category: 'camera',
    short: '가로와 세로의 비.',
    body: '센서의 화소 종횡비와 검사 대상의 종횡비가 다르면 한 축에 여백이 남습니다. 그만큼 화소를 낭비하는 것이므로 대상에 맞는 센서를 고르는 편이 좋습니다.',
    calc: 'sensor-format', related: ['sensor-size', 'fov'],
  },
  {
    id: 'diagonal', term: '대각', en: 'Diagonal', category: 'camera',
    aliases: ['센서 대각'],
    short: '센서 모서리에서 모서리까지의 길이.',
    body: '렌즈가 덮어야 할 범위를 정하는 값입니다. 1/2", 2/3" 같은 포맷 표기도 이 대각을 기준으로 붙습니다. 렌즈의 이미지 서클이 이보다 커야 합니다.',
    calc: 'sensor-format', related: ['sensor-size', 'image-circle'],
  },
  {
    id: 'detection-limit', term: '검출 한계', en: 'Detection Limit', category: 'camera',
    short: '안정적으로 잡아낼 수 있는 가장 작은 결함 크기.',
    body: '대상 분해능에 결함 판정 픽셀수를 곱한 값입니다. 한 픽셀에 걸치는 결함은 잡음과 구분되지 않으므로 보통 3 픽셀 이상을 기준으로 잡습니다.',
    calc: 'resolution', related: ['spatial-resolution', 'nyquist'],
  },
  {
    id: 'effective-pixel', term: '실효 픽셀 크기', en: 'Effective Pixel Size', category: 'camera',
    short: '비닝을 적용한 뒤의 픽셀 크기.',
    body: '2×2 비닝이면 센서 픽셀 크기의 두 배가 됩니다. 감도는 네 배 올라가지만 분해능은 절반이 됩니다.',
    calc: 'binning-roi', related: ['binning', 'pixel-pitch', 'sensitivity'],
  },
  {
    id: 'sensitivity', term: '감도', en: 'Sensitivity', category: 'camera',
    short: '같은 빛에서 얼마나 밝은 신호를 내는지.',
    body: '비닝으로 픽셀을 묶으면 받는 빛이 그만큼 늘어 감도가 올라갑니다. 2×2 면 네 배입니다. 어둡고 빠른 검사에서 분해능을 양보하고 얻는 값입니다.',
    calc: 'binning-roi', related: ['binning', 'effective-pixel', 'snr'],
  },

  {
    id: 'object-distance', term: '물체거리', en: 'Object Distance', category: 'lens',
    short: '렌즈 주점에서 대상까지의 거리.',
    body: 'WD 가 렌즈 앞면 기준이라면 물체거리는 렌즈 내부의 주점 기준입니다. 박막렌즈 계산에서는 이 값을 씁니다. 초점거리보다 짧으면 실상이 맺히지 않고 허상이 됩니다.',
    calc: 'thin-lens', related: ['image-distance', 'wd', 'focal-length'],
  },
  {
    id: 'optical-power', term: '굴절력', en: 'Optical Power', category: 'lens',
    short: '렌즈가 빛을 얼마나 세게 꺾는지. 초점거리의 역수입니다.',
    body: '단위는 디옵터(1/m)입니다. 렌즈를 밀착시켜 겹치면 굴절력이 단순히 더해지므로 조합 계산이 초점거리보다 간단해집니다. 음수면 발산 렌즈입니다.',
    calc: 'lens-combination', related: ['focal-length', 'curvature'],
  },
  {
    id: 'curvature', term: '곡률반경', en: 'Radius of Curvature', category: 'lens',
    short: '렌즈면이 이루는 구의 반지름.',
    body: '작을수록 많이 휘어 굴절력이 큽니다. 볼록하게 나온 면은 양수, 오목하게 들어간 면은 음수, 평면은 무한대(입력에서는 0)로 씁니다.',
    calc: 'lens-maker', related: ['optical-power', 'refractive-index'],
  },
  {
    id: 'cutoff', term: '회절 차단 주파수', en: 'Cutoff Frequency', category: 'lens',
    short: '회절 때문에 더 이상 구분할 수 없어지는 세밀함의 한계(lp/mm).',
    body: '1 mm 안에 몇 개의 선 쌍까지 구분되는지를 말합니다. 조리개를 조일수록 낮아집니다. 렌즈 MTF 곡선의 오른쪽 끝이 이 값입니다.',
    calc: 'aperture', related: ['airy', 'f-number', 'effective-f'],
  },
  {
    id: 'light-loss', term: '광량 손실', en: 'Light Loss', category: 'lens',
    short: '배율이 올라가면서 어두워지는 정도(스톱).',
    body: '유효 F수가 커지는 만큼 어두워집니다. 등배에서는 2 스톱, 즉 1/4 밝기가 됩니다. 접사링을 끼우면 노출이나 조명을 그만큼 보정해야 합니다.',
    calc: 'extension-tube', related: ['effective-f', 'stop', 'extension-tube'],
  },
  {
    id: 'focus-shift', term: '초점 이동', en: 'Focus Shift', category: 'wave',
    short: '유리를 통해 볼 때 초점이 뒤로 밀리는 거리.',
    body: '유리 두께 × (1 − 1/굴절률) 입니다. 3 mm 유리면 약 1 mm 밀립니다. 이 값이 DOF 안에 들어오면 재조정 없이 볼 수 있습니다.',
    calc: 'plane-plate', related: ['plate', 'dof', 'refractive-index'],
  },
  {
    id: 'lateral-shift', term: '측면 변위', en: 'Lateral Shift', category: 'wave',
    short: '유리를 비스듬히 통과한 빛이 옆으로 어긋나는 거리.',
    body: '수직으로 보면 0 이고 기울일수록 커집니다. 치수를 재는 검사에서는 이 값이 그대로 측정 오차가 됩니다.',
    calc: 'plane-plate', related: ['plate', 'snell', 'focus-shift'],
  },

  {
    id: 'incidence', term: '입사각', en: 'Angle of Incidence', category: 'wave',
    short: '빛이 경계면에 부딪히는 각도. 경계면의 법선에서 잽니다.',
    body: '수직으로 들어오면 0° 이고, 면을 따라 스치듯 들어오면 90° 에 가깝습니다. 반사율은 각도가 커질수록 급격히 올라갑니다.',
    calc: 'snell', related: ['refraction-angle', 'snell', 'fresnel'],
  },
  {
    id: 'refraction-angle', term: '굴절각', en: 'Angle of Refraction', category: 'wave',
    aliases: ['내부 굴절각'],
    short: '경계를 지난 빛이 꺾여 나아가는 각도.',
    body: '굴절률이 큰 매질로 들어가면 법선 쪽으로 꺾여 입사각보다 작아집니다. 유리 안에서는 아무리 비스듬히 넣어도 약 41° 를 넘지 못합니다.',
    calc: 'snell', related: ['incidence', 'snell', 'critical-angle'],
  },
  {
    id: 'diffraction-angle', term: '회절각', en: 'Diffraction Angle', category: 'wave',
    short: '격자를 지난 빛이 차수별로 갈라져 나가는 각도.',
    body: '파장이 길수록 크게 꺾여 색이 분리됩니다. 분광기가 이 원리로 파장을 나눕니다.',
    calc: 'grating', related: ['order', 'grating-period', 'dispersion'],
  },
  {
    id: 'order', term: '차수', en: 'Diffraction Order', category: 'wave',
    short: '격자에서 갈라져 나온 빛의 번호.',
    body: '0 차는 꺾이지 않고 그대로 지나갑니다. 1 차, 2 차로 갈수록 크게 꺾이지만 세기는 약해집니다. 격자 주기와 파장의 비가 나올 수 있는 최대 차수를 정합니다.',
    calc: 'grating', related: ['diffraction-angle', 'grating-period', 'wavelength'],
  },
  {
    id: 'grating-period', term: '격자 주기', en: 'Grating Period', category: 'wave',
    aliases: ['격자 밀도'],
    short: '격자에서 홈과 홈 사이의 간격.',
    body: '보통 1 mm 당 몇 줄인지(lines/mm)로 표기하며 그 역수가 주기입니다. 600 lines/mm 면 주기가 약 1.67 µm 입니다. 주기가 파장보다 짧으면 0 차 외에는 거의 나오지 않습니다.',
    calc: 'grating', related: ['order', 'diffraction-angle', 'wavelength'],
  },
  {
    id: 'dispersion', term: '각분산', en: 'Angular Dispersion', category: 'wave',
    short: '파장이 1 nm 달라질 때 회절각이 얼마나 벌어지는지.',
    body: '값이 클수록 색을 잘게 나눌 수 있습니다. 분광기의 해상력을 좌우합니다.',
    calc: 'grating', related: ['diffraction-angle', 'grating-period'],
  },
  {
    id: 'wavelength', term: '파장', en: 'Wavelength', category: 'wave',
    short: '빛의 색을 정하는 값(nm).',
    body: '가시광은 대략 400~700 nm 이고 백색광은 보통 550 nm 로 계산합니다. 회절과 분해능 한계가 이 값에 비례하므로, 짧은 파장을 쓰면 더 세밀하게 볼 수 있습니다.',
    calc: 'aperture', related: ['airy', 'grating-period', 'cutoff'],
  },
  {
    id: 'transmittance', term: '투과율', en: 'Transmittance', category: 'wave',
    short: '경계를 통과해 지나가는 빛의 비율.',
    body: '반사율을 1 에서 뺀 값입니다. 유리는 앞뒤 두 면에서 각각 반사되므로 코팅 없이는 8 % 가량 잃습니다.',
    calc: 'snell', related: ['fresnel', 'plate'],
  },

  {
    id: 'scale-change', term: '크기 변화율', en: 'Scale Change', category: 'geometry',
    short: '대상 높이가 달라졌을 때 크기가 몇 % 변하는지.',
    body: '높이차를 WD 로 나눈 값입니다. WD 300 mm 에서 높이가 5 mm 다르면 약 1.7 % 크게 찍힙니다. 측정 길이에 이 비율을 곱한 만큼이 오차가 됩니다.',
    calc: 'perspective-error', related: ['perspective', 'telecentric', 'wd'],
  },
  {
    id: 'uncertainty', term: '측정 불확실도', en: 'Measurement Uncertainty', category: 'geometry',
    short: '에지를 어디로 볼지에 따라 생기는 측정값의 흔들림.',
    body: '양쪽 에지가 각각 흔들리므로 에지 오차의 두 배로 봅니다. 대상이 작을수록 이 몫의 비중이 커져 상대 오차가 커집니다.',
    calc: 'pixel-calibration', related: ['calibration', 'spatial-resolution'],
  },
  {
    id: 'tilt', term: '경사각', en: 'Tilt Angle', category: 'geometry',
    short: '광축이 대상면 수직에서 벗어난 각도.',
    body: '기울면 FOV 양끝의 WD 가 달라져 배율이 어긋나고 사각형이 사다리꼴로 찍힙니다. 대상면 전체에 초점을 맞추려면 그 거리차만큼의 DOF 도 필요합니다.',
    calc: 'camera-tilt', related: ['keystone', 'dof', 'perspective'],
  },

  {
    id: 'conveyor-speed', term: '이송 속도', en: 'Conveyor Speed', category: 'encoder',
    aliases: ['최대 이동속도'],
    short: '검사 대상이 지나가는 속도(mm/s).',
    body: '노출 시간과 곱하면 모션 블러가, 엔코더 분해능으로 나누면 트리거 주파수가 나옵니다. 라인스캔에서는 필요한 라인레이트를 직접 정합니다.',
    calc: 'motion-blur', related: ['motion-blur', 'line-rate', 'max-frequency'],
  },
  {
    id: 'scan-resolution', term: '이송방향 분해능', en: 'Scan-direction Resolution', category: 'encoder',
    short: '라인스캔에서 한 라인이 담당하는 이송방향 길이(µm).',
    body: '가로 분해능과 같게 맞춰야 정사각 픽셀이 나옵니다. 어긋나면 상이 이송 방향으로 늘어나거나 눌립니다.',
    calc: 'line-rate', related: ['line-rate', 'spatial-resolution', 'divider'],
  },
  {
    id: 'max-frequency', term: '최대주파수', en: 'Maximum Frequency', category: 'encoder',
    short: '가장 빠를 때 엔코더가 초당 내보내는 펄스 수(Hz).',
    body: '이송 속도를 엔코더 분해능으로 나눈 값입니다. 트리거 보드가 이 주파수를 받아낼 수 있어야 하고, 그 역수가 엔코더 주기가 됩니다.',
    calc: 'trigger-divider', related: ['encoder-period', 'encoder-resolution', 'conveyor-speed'],
  },
  {
    id: 'encoder-period', term: '입력엔코더 주기', en: 'Encoder Period', category: 'encoder',
    aliases: ['엔코더 주기'],
    short: '엔코더 펄스와 펄스 사이의 시간(µs).',
    body: '최대주파수의 역수입니다. 트리거 펄스폭은 이 주기 안에 끝나야 하므로 여기서 가드 타임을 뺀 값이 상한이 됩니다.',
    calc: 'trigger-divider', related: ['max-frequency', 'guard-time', 'pulse-width'],
  },
  {
    id: 'guard-time', term: '가드 타임', en: 'Guard Time', category: 'encoder',
    short: '펄스폭이 주기를 넘지 않도록 빼 두는 여유 시간.',
    body: '보통 0.1 µs 로 잡습니다. 이 여유가 없으면 다음 펄스가 오기 전에 트리거가 끝나지 않아 신호가 겹칩니다.',
    calc: 'trigger-divider', related: ['pulse-width', 'encoder-period'],
  },
  {
    id: 'timer-resolution', term: '타이머 분해능', en: 'Timer Resolution', category: 'encoder',
    short: '트리거 보드가 시간을 세는 최소 눈금(ns).',
    body: 'ER-3 는 20 ns 입니다. 펄스폭을 시간이 아니라 이 눈금의 개수로 넣기 때문에, 설정값은 펄스폭을 이 분해능으로 나눈 정수가 됩니다.',
    calc: 'trigger-divider', related: ['pulse-width', 'trigger-period'],
  },
  {
    id: 'trigger-period', term: '트리거 출력 주기', en: 'Trigger Period', category: 'encoder',
    short: '실제로 촬상 신호가 나가는 간격(µs).',
    body: '엔코더 주기에 분주비를 곱한 값입니다. 그 역수가 라인레이트가 되므로 카메라가 이 속도를 감당할 수 있는지 확인해야 합니다.',
    calc: 'trigger-divider', related: ['divider', 'encoder-period', 'line-rate'],
  },
  {
    id: 'roller', term: '롤러 지름', en: 'Roller Diameter', category: 'encoder',
    short: '엔코더가 물려 도는 롤러의 지름.',
    body: '둘레(지름 × π)를 1회전당 펄스 수로 나누면 엔코더 분해능이 나옵니다. 롤러가 굵을수록 한 펄스가 나타내는 거리가 길어져 분해능이 나빠집니다.',
    calc: 'encoder-resolution', related: ['encoder-resolution', 'ppr', 'multiplier'],
  },
  {
    id: 'pulse-position', term: '펄스 위치 값', en: 'Absolute Position', category: 'encoder',
    short: '컨트롤러가 세고 있는 엔코더 펄스의 누적 위치.',
    body: '이동 전후로 이 값을 읽어 차이를 내면 그 구간에서 몇 펄스가 늘었는지 알 수 있습니다. 보통 초기화 명령으로 0 을 만든 뒤 이동시키고 다시 읽습니다. 이동한 실제 거리를 이 변화량으로 나누면 엔코더 분해능이 나옵니다.',
    calc: 'encoder-resolution', related: ['encoder-resolution', 'ppr', 'multiplier'],
  },
  {
    id: 'tdi', term: 'TDI', en: 'Time Delay Integration', category: 'camera',
    aliases: ['TDI 단수'],
    short: '같은 지점을 여러 단에 걸쳐 누적 노출하는 라인스캔 방식.',
    body: '이송을 따라가며 전하를 단에서 단으로 옮겨 담아 신호를 키웁니다. 256 단이면 한 번 찍는 것보다 훨씬 밝아 어두운 검사에 씁니다. 다만 단을 넘길 때마다 이송과 어긋난 몫이 쌓이므로 단수가 높을수록 트리거 정합에 예민해집니다.',
    calc: 'tdi-alignment', related: ['tdi-smear', 'divider', 'line-rate'],
  },
  {
    id: 'sw-trigger', term: 'SW 트리거', en: 'Software Trigger', category: 'encoder',
    aliases: ['소프트웨어 트리거'],
    short: '엔코더 신호 대신 정해진 주기로 촬상 신호를 주는 방식.',
    body: '라인레이트를 직접 계산해 넣으므로 분주비의 정수 제약이 사라져 Y 배율 오차가 0 이 됩니다. 다만 이송 속도가 흔들리면 그대로 상이 늘어나거나 눌리므로, 속도가 안정된 장비에서만 씁니다.',
    calc: 'tdi-alignment', related: ['tdi-smear', 'line-rate', 'divider'],
  },
  {
    id: 'tdi-smear', term: 'TDI 스미어', en: 'TDI Smear', category: 'camera',
    aliases: ['스미어'],
    short: 'TDI 단을 지나며 어긋남이 쌓여 상이 이송 방향으로 번지는 것.',
    body: '한 단마다 생기는 오차에 단수를 곱한 만큼 번집니다. 방향이 있는 번짐이라 진동이나 흔들림처럼 보입니다. 1 px 이내로 잡으려면 분주비 오차가 TDI 단수의 역수보다 작아야 하므로 256 단이면 0.39 % 이내여야 합니다.',
    calc: 'tdi-alignment', related: ['tdi', 'divider', 'scaler'],
  },
  {
    id: 'pixels-on-defect', term: '결함 판정 픽셀수', en: 'Pixels on Defect', category: 'camera',
    short: '결함 하나를 몇 픽셀로 잡아야 판정할지 정하는 기준.',
    body: '1 픽셀에 걸치는 결함은 잡음과 구분되지 않습니다. 나이퀴스트 기준으로 최소 2 픽셀, 안정적인 판정에는 3~5 픽셀을 씁니다. 이 값에 대상 분해능을 곱한 것이 검출 한계입니다.',
    calc: 'resolution', related: ['detection-limit', 'nyquist', 'spatial-resolution'],
  },
  {
    id: 'frame-size', term: '프레임당 용량', en: 'Frame Size', category: 'camera',
    short: '한 장의 영상이 차지하는 데이터 크기(MB).',
    body: '화소수 × 비트 깊이 / 8 입니다. 여기에 프레임레이트를 곱하면 데이터 레이트가, 대역폭으로 나누면 전송 시간이 나옵니다.',
    calc: 'data-rate', related: ['data-rate', 'bandwidth', 'bit-depth'],
  },
  {
    id: 'adu', term: 'ADU 당 전자수', en: 'Electrons per ADU', category: 'camera',
    short: '디지털 값 한 칸이 전자 몇 개에 해당하는지.',
    body: 'ADU 는 A/D 변환기가 내는 정수 눈금입니다. 이 값이 1 보다 작으면 양자화가 잡음보다 촘촘하다는 뜻이라, 비트를 더 늘려도 얻을 정보가 없습니다.',
    calc: 'dynamic-range', related: ['bit-depth', 'dr', 'read-noise'],
  },
  {
    id: 'line-period', term: '라인 주기', en: 'Line Period', category: 'camera',
    aliases: ['행당 시간'],
    short: '라인스캔이 한 줄을 찍는 데 쓰는 시간.',
    body: '라인레이트의 역수입니다. 노출은 다음 라인이 시작되기 전에 끝나야 하므로 이 값이 노출 시간의 상한이 됩니다.',
    calc: 'line-rate', related: ['line-rate', 'exposure', 'readout'],
  },
  {
    id: 'scan-width', term: '스캔 폭', en: 'Scan Width', category: 'camera',
    short: '라인스캔 카메라가 한 줄에 담는 가로 폭.',
    body: '라인 화소수 × 이송방향 분해능입니다. 검사 대상의 폭이 이 안에 들어와야 하며, 모자라면 카메라를 나란히 여러 대 두어 이어 붙입니다.',
    calc: 'line-rate', related: ['line-rate', 'scan-resolution', 'fov'],
  },
  {
    id: 'trigger-delay', term: '딜레이', en: 'Trigger Delay', category: 'encoder',
    short: '트리거 신호를 얼마나 늦춰 내보낼지.',
    body: '엔코더 위치와 실제 촬상 위치가 어긋날 때 보정하는 값입니다. 보통 0 으로 두고, 조명이나 카메라의 응답 지연을 맞춰야 할 때만 씁니다.',
    calc: 'trigger-divider', related: ['pulse-width', 'trigger-period'],
  },
  {
    id: 'deviation', term: '광선 꺾임각', en: 'Deviation', category: 'wave',
    short: '경계를 지나며 빛의 진행 방향이 바뀐 각도.',
    body: '입사각에서 굴절각을 뺀 값입니다. 클수록 크게 꺾인 것이며, 프리즘의 분산도 이 각도의 파장별 차이로 생깁니다.',
    calc: 'snell', related: ['incidence', 'refraction-angle', 'snell'],
  },
  {
    id: 'optical-path', term: '유리 내 광로', en: 'Optical Path in Glass', category: 'wave',
    short: '빛이 유리 안에서 실제로 지나는 길이.',
    body: '수직으로 들어가면 두께와 같고, 비스듬히 들어갈수록 길어집니다. 이 길이만큼 흡수와 산란이 누적되므로 두꺼운 유리일수록 어두워집니다.',
    calc: 'plane-plate', related: ['plate', 'refraction-angle', 'transmittance'],
  },
  {
    id: 'surface-loss', term: '양면 반사 손실', en: 'Surface Loss', category: 'wave',
    short: '유리 앞뒤 두 면에서 반사로 잃는 빛의 비율.',
    body: '한 면에서 약 4 % 씩, 합쳐 8 % 가량 잃습니다. 반사방지 코팅을 하면 1 % 아래로 줄일 수 있습니다. 이 반사광이 검사 화면에 겹쳐 보이는 원인이기도 합니다.',
    calc: 'plane-plate', related: ['fresnel', 'transmittance', 'plate'],
  },
  {
    id: 'edge-error', term: '에지 검출 오차', en: 'Edge Error', category: 'geometry',
    short: '에지의 위치를 얼마나 정확히 찾을 수 있는지.',
    body: '보통 0.5 픽셀 정도로 잡습니다. 서브픽셀 알고리즘을 쓰면 더 줄어듭니다. 양쪽 에지가 각각 흔들리므로 측정 불확실도는 이 값의 두 배로 봅니다.',
    calc: 'pixel-calibration', related: ['uncertainty', 'calibration'],
  },

  /* ---------- 스트로브 · LED ---------- */
  {
    id: 'strobe-pulse', term: '펄스 폭', en: 'Pulse Width', category: 'lighting',
    aliases: ['최대 펄스 폭', '권장 펄스 폭', '허용 펄스 폭', '필요 펄스 폭'],
    short: '스트로브가 한 번 켜져 있는 시간.',
    body: '스트로브를 쓰면 이 값이 실질 노출입니다. 모션 블러도 노출 시간이 아니라 펄스 폭으로 정해집니다. 짧을수록 잘 멈추지만 그만큼 밝기를 올려야 하고, 듀티가 낮아져 오버드라이브 여유는 커집니다.',
    calc: 'strobe-freeze', related: ['strobe', 'duty', 'motion-blur', 'overdrive'],
  },
  {
    id: 'camera-delay', term: '카메라 트리거 지연', en: 'Camera Trigger Delay', category: 'lighting',
    short: '트리거가 들어가고 실제로 노출이 시작되기까지 걸리는 시간.',
    body: '카메라마다 수 µs 에서 수십 µs 로 다릅니다. 조명 지연과 이 값이 다르면 펄스가 노출 창을 벗어나 이미지가 어두워집니다. 데이터시트의 trigger latency 항목을 봅니다.',
    calc: 'strobe-timing', related: ['light-delay', 'overlap-time', 'jitter'],
  },
  {
    id: 'light-delay', term: '조명 트리거 지연', en: 'Light Trigger Delay', category: 'lighting',
    aliases: ['권장 조명 지연'],
    short: '트리거가 들어가고 조명이 실제로 빛을 내기까지 걸리는 시간.',
    body: '컨트롤러의 응답 시간에 LED 상승 시간을 더한 값입니다. 대부분의 스트로브 컨트롤러가 이 지연을 µs 단위로 설정할 수 있게 해 두었습니다. 펄스를 노출 창 한가운데 두는 값이 지터에 가장 강합니다.',
    calc: 'strobe-timing', related: ['camera-delay', 'strobe-pulse', 'overlap-time'],
  },
  {
    id: 'jitter', term: '트리거 지터', en: 'Trigger Jitter', category: 'lighting',
    short: '트리거 시점이 프레임마다 흔들리는 폭.',
    body: '± 로 표기합니다. 앞뒤 여유가 지터보다 작으면 어떤 프레임에서는 펄스가 노출 밖으로 밀려 그 장만 어두워집니다. 밝기가 프레임마다 들쭉날쭉하면 먼저 의심할 항목입니다.',
    calc: 'strobe-timing', related: ['timing-margin', 'camera-delay', 'light-delay'],
  },
  {
    id: 'capture-ratio', term: '광량 취득률', en: 'Capture Ratio', category: 'lighting',
    short: '펄스가 낸 빛 중 실제로 센서에 담긴 비율.',
    body: '겹침 시간 ÷ 펄스 폭입니다. 100 % 가 아니면 조명은 제 몫을 다 했는데 노출 창이 그것을 다 받지 못한 것입니다. 조명을 더 세게 하기 전에 지연부터 맞추는 편이 낫습니다.',
    calc: 'strobe-timing', related: ['overlap-time', 'light-delay', 'strobe-pulse'],
  },
  {
    id: 'overlap-time', term: '겹침 시간', en: 'Overlap', category: 'lighting',
    short: '노출 창과 발광 창이 동시에 열려 있는 시간.',
    body: '이 구간에서만 빛이 센서에 쌓입니다. 겹침이 0 이면 조명이 켜져 있어도 완전히 어두운 이미지가 나옵니다. 배선이나 조명을 의심하기 전에 지연 설정을 먼저 확인하세요.',
    calc: 'strobe-timing', related: ['capture-ratio', 'camera-delay', 'light-delay'],
  },
  {
    id: 'timing-margin', term: '타이밍 여유', en: 'Timing Margin', category: 'lighting',
    aliases: ['앞 여유', '뒤 여유', '가장 좁은 여유'],
    short: '펄스 앞뒤로 노출 창이 남아 있는 시간.',
    body: '앞 여유는 노출이 시작되고 펄스가 켜지기까지, 뒤 여유는 펄스가 꺼지고 노출이 끝나기까지입니다. 둘 다 트리거 지터보다 커야 매 프레임 같은 밝기가 나옵니다. 둘을 같게 두는 설정이 가장 안전합니다.',
    calc: 'strobe-timing', related: ['jitter', 'overlap-time', 'light-delay'],
  },
  {
    id: 'allowed-blur', term: '허용 블러', en: 'Allowed Blur', category: 'lighting',
    short: '검사에 지장이 없다고 보는 번짐의 한계.',
    body: '보통 0.5 px 이하로 잡습니다. 1 px 을 넘으면 에지가 뭉개져 치수 측정과 미세 결함 판정이 흔들립니다. 이 값이 정해지면 이송 속도에서 펄스 폭의 상한이 바로 나옵니다.',
    calc: 'strobe-freeze', related: ['motion-blur', 'strobe-pulse', 'conveyor-speed'],
  },
  {
    id: 'headroom', term: '여유 배수', en: 'Headroom', category: 'lighting',
    short: '한계까지 몇 배가 남아 있는지.',
    body: '1 보다 크면 아직 여유가 있다는 뜻입니다. 2 배 이상 남겨 두면 이송 속도가 조금 올라가거나 조명이 노후되어도 조건을 다시 잡지 않아도 됩니다.',
    calc: 'strobe-freeze', related: ['allowed-blur', 'overdrive'],
  },
  {
    id: 'ambient', term: '주변광', en: 'Ambient Light', category: 'lighting',
    short: '검사 조명이 아닌, 항상 들어오는 빛.',
    body: '천장등이나 창문으로 들어오는 빛입니다. 스트로브와 달리 노출 내내 쌓이므로, 노출이 길면 그만큼 많이 섞이고 대상이 움직인 만큼 번집니다. 노출을 펄스 폭에 가깝게 줄이거나 차광막·대역통과 필터로 막습니다.',
    calc: 'strobe-exposure', related: ['strobe', 'exposure', 'illuminance'],
  },
  {
    id: 'continuous-light', term: '연속광', en: 'Continuous Light', category: 'lighting',
    short: '계속 켜 두는 조명.',
    body: '정격 이상으로 올릴 수 없어 밝기에 한계가 있습니다. 같은 노출량을 더 짧은 시간에 담으려면 시간이 줄어든 배수만큼 밝아야 하고, 그 몫을 스트로브의 오버드라이브가 맡습니다.',
    calc: 'strobe-exposure', related: ['strobe', 'overdrive', 'exposure'],
  },
  {
    id: 'derating', term: '정격 여유', en: 'Derating', category: 'lighting',
    short: '한계치의 몇 배까지만 쓸지 정해 두는 안전 계수.',
    body: '0.8 이면 20 % 를 남겨 둔다는 뜻입니다. 주위 온도가 오르거나 LED 가 노후되면 실제 한계는 스펙보다 낮아지므로, 계산상 한계에 딱 맞춰 쓰면 현장에서 넘어갑니다.',
    calc: 'strobe', related: ['duty', 'overdrive', 'average-load'],
  },
  {
    id: 'forward-voltage', term: '순방향 전압', en: 'Forward Voltage', category: 'lighting',
    short: 'LED 에 전류가 흐를 때 소자 양단에 걸리는 전압.',
    body: '데이터시트의 Vf 입니다. 전류가 커지면 함께 올라가므로, 오버드라이브 조건에서는 정격 Vf 보다 조금 높은 값을 넣어야 전력이 맞습니다.',
    calc: 'led-thermal', related: ['peak-current', 'avg-power'],
  },
  {
    id: 'peak-current', term: '펄스 전류', en: 'Peak Current', category: 'lighting',
    short: '펄스가 켜져 있는 동안 흐르는 전류.',
    body: '정격 전류의 몇 배를 흘리는지가 곧 오버드라이브 배수입니다. 순간값이라 평균 전력은 여기에 듀티를 곱한 값이지만, 소자가 견딜 수 있는 펄스 전류의 절대 한계는 데이터시트에 따로 정해져 있습니다.',
    calc: 'led-thermal', related: ['overdrive', 'forward-voltage', 'duty'],
  },
  {
    id: 'avg-power', term: '평균 전력', en: 'Average Power', category: 'lighting',
    aliases: ['피크 전력'],
    short: '피크 전력에 듀티를 곱한, 시간 평균 소비 전력.',
    body: '피크 전력은 펄스가 켜진 순간의 전력이고, 발열을 정하는 것은 평균 전력입니다. 듀티가 낮으면 아주 세게 때려도 평균은 작습니다. 스트로브가 오버드라이브를 견디는 이유가 이것입니다.',
    calc: 'led-thermal', related: ['duty', 'average-load', 'junction-temp'],
  },
  {
    id: 'thermal-resistance', term: '열저항', en: 'Thermal Resistance', category: 'lighting',
    short: '1 W 를 흘렸을 때 온도가 몇 도 오르는지.',
    body: '단위는 °C/W 입니다. 데이터시트의 소자 단품 값만 쓰면 실제보다 낮게 나옵니다. 기판·하우징·브래킷까지 이어지는 경로 전체를 더한 값을 써야 현장 온도와 맞습니다.',
    calc: 'led-thermal', related: ['junction-temp', 'ambient-temp', 'avg-power'],
  },
  {
    id: 'ambient-temp', term: '주위 온도', en: 'Ambient Temperature', category: 'lighting',
    short: '조명이 놓인 곳의 공기 온도.',
    body: '정션 온도의 출발점입니다. 장비 내부는 실온보다 10~20 °C 높은 경우가 흔하므로, 25 °C 로 계산해 두면 여름에 한계를 넘길 수 있습니다.',
    calc: 'led-thermal', related: ['junction-temp', 'thermal-resistance'],
  },
  {
    id: 'junction-temp', term: '정션 온도', en: 'Junction Temperature', category: 'lighting',
    aliases: ['온도 상승'],
    short: 'LED 칩 접합부의 온도.',
    body: '주위 온도에 발열 × 열저항을 더한 값입니다. 수명과 광량을 함께 좌우하며, 한계를 넘으면 밝기가 눈에 띄게 떨어지고 수명이 급격히 짧아집니다. 대부분의 소자가 125 °C 안팎을 한계로 둡니다.',
    calc: 'led-thermal', related: ['thermal-resistance', 'ambient-temp', 'output-coefficient'],
  },
  {
    id: 'wall-plug', term: '광 변환 효율', en: 'Wall-plug Efficiency', category: 'lighting',
    short: '넣은 전력 중 빛으로 나가는 비율.',
    body: '나머지는 전부 열이 됩니다. 백색 LED 는 20~40 % 정도입니다. 효율을 0 으로 두면 전력을 모두 열로 보는 보수적인 계산이 됩니다.',
    calc: 'led-thermal', related: ['avg-power', 'junction-temp'],
  },
  {
    id: 'output-coefficient', term: '광출력 온도계수', en: 'Output Coefficient', category: 'lighting',
    aliases: ['상대 광출력'],
    short: '정션 온도가 1 °C 오를 때 밝기가 몇 % 떨어지는지.',
    body: '백색·청색은 −0.2 ~ −0.5 %/°C, 적색은 그보다 큽니다. 장비를 켜고 수십 분 뒤 밝기가 서서히 내려가 임계값이 흔들리는 현상의 원인입니다. 워밍업 후에 조건을 잡는 이유이기도 합니다.',
    calc: 'led-thermal', related: ['junction-temp', 'illuminance'],
  },
];

export const getTerm = (id) => TERMS.find((t) => t.id === id);

// 화면에 쓰인 표기로 용어를 찾는다.
const BY_TEXT = new Map();
for (const entry of TERMS) {
  for (const key of [entry.term, ...(entry.aliases || [])]) BY_TEXT.set(key, entry);
}

export const lookup = (text) => BY_TEXT.get(text) || null;

// 긴 표기를 먼저 찾아야 "대상 분해능" 이 "분해능" 으로 잘리지 않는다.
const PATTERN = new RegExp(
  [...BY_TEXT.keys()]
    .sort((a, b) => b.length - a.length)
    .map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|'),
  'g'
);

// 본문에서 아는 용어를 찾아 누를 수 있는 조각으로 바꾼다.
//
// 경계 판정이 국문과 영문에서 다르다.
//   영문 약어(DOF, WD, NA) - 앞뒤 모두 글자가 아니어야 한다. DRAM 의 DR 을 잡으면 안 된다.
//   국문 용어             - 앞만 본다. "F수를", "배율이" 처럼 조사가 바로 붙기 때문에
//                           뒤까지 막으면 본문에서 거의 걸리지 않는다.
export function annotate(text, onPick) {
  const frag = document.createDocumentFragment();
  let last = 0;
  PATTERN.lastIndex = 0;

  for (let m = PATTERN.exec(text); m; m = PATTERN.exec(text)) {
    const before = text[m.index - 1] || '';
    const after = text[m.index + m[0].length] || '';
    const hasHangul = /[가-힣]/.test(m[0]);
    const glued = hasHangul
      ? /[가-힣A-Za-z]/.test(before)
      : /[A-Za-z]/.test(before) || /[A-Za-z]/.test(after);
    if (glued) continue;

    if (m.index > last) frag.append(text.slice(last, m.index));
    const entry = BY_TEXT.get(m[0]);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'term';
    btn.textContent = m[0];
    btn.title = `${entry.en} — 눌러서 뜻 보기`;
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      onPick(entry);
    });
    frag.append(btn);
    last = m.index + m[0].length;
  }

  if (last === 0) return null;
  if (last < text.length) frag.append(text.slice(last));
  return frag;
}

export function searchTerms(query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return TERMS.filter((t) =>
    [t.term, t.en, ...(t.aliases || []), t.short, t.body].join(' ').toLowerCase().includes(q)
  );
}
