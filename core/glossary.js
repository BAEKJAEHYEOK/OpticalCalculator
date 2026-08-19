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
    aliases: ['회절 스팟'],
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
    aliases: ['이미지 분해능'],
    short: '대상 위에서 픽셀 하나가 차지하는 실제 크기(µm/px).',
    body: '센서 픽셀 크기를 배율로 나눈 값이자, FOV 를 화소수로 나눈 값입니다. 이 값이 검사 정밀도를 결정합니다. 결함 하나를 잡으려면 보통 3 픽셀 이상 걸쳐야 하므로, 검출 한계는 이 값의 3 배쯤으로 봅니다.',
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
    body: '치수를 아는 타깃을 찍어 몇 픽셀인지 세면 축척(mm/px)이 나옵니다. 기준 물체가 클수록 축척이 정확해지므로, FOV 를 가로지르는 큰 타깃을 씁니다.',
    calc: 'pixel-calibration', related: ['spatial-resolution', 'keystone'],
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
    aliases: ['펄스폭'],
    short: '트리거 신호가 켜져 있는 시간.',
    body: '다음 엔코더 펄스가 오기 전에 끝나야 하므로 엔코더 주기에서 여유를 뺀 값으로 잡습니다. 트리거 보드에는 시간이 아니라 타이머 눈금 개수로 넣으므로, 폭을 보드의 분해능(예: 20 ns)으로 나눈 정수를 설정합니다.',
    calc: 'trigger-divider', related: ['divider', 'encoder-resolution'],
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
