import { apiClient } from "./client";
import type { Category, Product } from "../types";

interface SeedCategory {
  name: string;
  slug: string;
  image_url: string;
  options: Record<string, string[]>;
  extraProduct: Omit<Product, "id" | "app_id" | "category_id">;
  products: Array<
    Omit<Product, "id" | "app_id" | "category_id"> & {
      category_id?: number;
    }
  >;
}

const seedCategories: SeedCategory[] = [
  {
    name: "Клавиатуры & Свитчи",
    slug: "keyboards",
    image_url:
      "https://images.unsplash.com/photo-1595225476474-87563907a212?auto=format&fit=crop&w=1200&q=85",
    options: {
      switches: ["Linear Violet", "Tactile Amber"],
      layout: ["75% ANSI", "TKL ISO"],
    },
    extraProduct: {
      title: "Neon Forge Wireless 65",
      description:
        "Компактная беспроводная механическая клавиатура с алюминиевой пластиной, сменными свитчами и многослойной шумоизоляцией для точного и тихого набора.",
      price: 169,
      unit: "шт.",
      stock: 19,
      attributes: {
        switches: "Hot-swap mechanical",
        connection: "2.4 GHz / Bluetooth / USB-C",
        battery: "4000 mAh",
        backlight: "Per-key RGB",
      },
      main_image_url:
        "https://images.unsplash.com/photo-1595225476474-87563907a212?auto=format&fit=crop&w=1200&q=85",
      is_available: true,
    },
    products: [
      {
        title: "Cyberpunk Mechanical Keyboard",
        description:
          "Механическая клавиатура с алюминиевым корпусом, горячей заменой свитчей и адресной подсветкой.",
        price: 189,
        unit: "шт.",
        stock: 24,
        attributes: {
          switches: "Linear Violet",
          backlight: "RGB",
          layout: "75%, ANSI",
          connection: "USB-C / 2.4 GHz",
        },
        main_image_url:
          "https://images.unsplash.com/photo-1595225476474-87563907a212?auto=format&fit=crop&w=1200&q=85",
        is_available: true,
      },
      {
        title: "Neon TKL Pro",
        description:
          "Компактная игровая TKL-клавиатура с тихими линейными переключателями и макросами.",
        price: 149,
        unit: "шт.",
        stock: 18,
        attributes: {
          switches: "Linear Red",
          backlight: "Per-key RGB",
          polling_rate: "1000 Hz",
          layout: "TKL, ANSI",
        },
        main_image_url:
          "https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=1200&q=85",
        is_available: true,
      },
      {
        title: "Violet Switch Pack",
        description:
          "Набор из 70 предварительно смазанных линейных свитчей для кастомной клавиатуры.",
        price: 39,
        unit: "набор",
        stock: 60,
        attributes: {
          switches: "Linear Violet",
          actuation_force: "45 g",
          quantity: "70 шт.",
          hot_swap: true,
        },
        main_image_url:
          "https://images.unsplash.com/photo-1618384887929-16ec33fab9ef?auto=format&fit=crop&w=1200&q=85",
        is_available: true,
      },
    ],
  },
  {
    name: "Комплектующие ПК",
    slug: "components",
    image_url:
      "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=1200&q=85",
    options: {
      memory: ["12 GB", "16 GB"],
      finish: ["Obsidian Black", "Silver"],
    },
    extraProduct: {
      title: "Radeon RX 7900 XTX Phantom",
      description:
        "Видеокарта для бескомпромиссного 4K-гейминга с 24 ГБ быстрой видеопамяти, усиленной системой охлаждения и металлическим backplate.",
      price: 999,
      unit: "шт.",
      stock: 8,
      attributes: {
        memory: "24 GB GDDR6",
        interface: "PCIe 4.0",
        cooling: "Triple-fan vapor chamber",
        outputs: "2×HDMI 2.1 / 2×DisplayPort 2.1",
      },
      main_image_url:
        "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=1200&q=85",
      is_available: true,
    },
    products: [
      {
        title: "GeForce RTX 4090 Neon Edition",
        description:
          "Флагманская видеокарта для 4K-гейминга, рендеринга и задач машинного обучения.",
        price: 1899,
        unit: "шт.",
        stock: 5,
        attributes: {
          memory: "24 GB GDDR6X",
          architecture: "Ada Lovelace",
          ray_tracing: "Да",
          cooling: "Triple-fan",
        },
        main_image_url:
          "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=1200&q=85",
        is_available: true,
      },
      {
        title: "Phantom X Gaming PC",
        description:
          "Готовая игровая система с жидкостным охлаждением и прозрачной панелью корпуса.",
        price: 2499,
        unit: "шт.",
        stock: 7,
        attributes: {
          processor: "Ryzen 9 7950X",
          graphics: "GeForce RTX 4080 SUPER",
          memory: "64 GB DDR5",
          storage: "2 TB NVMe",
        },
        main_image_url:
          "https://images.unsplash.com/photo-1593640408182-31c70c8268f5?auto=format&fit=crop&w=1200&q=85",
        is_available: true,
      },
      {
        title: "Quantum DDR5 RGB 32GB",
        description:
          "Высокоскоростной комплект памяти с низкими таймингами и синхронизацией RGB.",
        price: 139,
        unit: "комплект",
        stock: 32,
        attributes: {
          capacity: "32 GB (2×16 GB)",
          frequency: "6000 MHz",
          latency: "CL30",
          backlight: "RGB",
        },
        main_image_url:
          "https://images.unsplash.com/photo-1562976540-1502c2145186?auto=format&fit=crop&w=1200&q=85",
        is_available: true,
      },
    ],
  },
  {
    name: "Графические карты",
    slug: "graphics-cards",
    image_url:
      "https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=1200&q=85",
    options: {
      memory: ["12 GB", "16 GB", "24 GB"],
      finish: ["Obsidian Black", "Arctic Silver"],
    },
    extraProduct: {
      title: "Astra RTX 4070 Super",
      description:
        "Сбалансированная видеокарта для высоких настроек в 1440p, с аппаратной трассировкой лучей, DLSS и тихим двухслотовым охлаждением.",
      price: 699,
      unit: "шт.",
      stock: 11,
      attributes: {
        memory: "12 GB GDDR6X",
        architecture: "Ada Lovelace",
        cooling: "Dual-fan",
        outputs: "1×HDMI 2.1 / 3×DisplayPort 1.4a",
      },
      main_image_url:
        "https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=1200&q=85",
      is_available: true,
    },
    products: [
      {
        title: "GeForce RTX 4080 SUPER Founders",
        description:
          "Мощная видеокарта для ультра-настроек в 4K и профессионального рендеринга: 16 ГБ видеопамяти, современный энкодер и поддержка генерации кадров.",
        price: 1299,
        unit: "шт.",
        stock: 7,
        attributes: {
          memory: "16 GB GDDR6X",
          architecture: "Ada Lovelace",
          ray_tracing: "3rd generation",
          cooling: "Triple-slot vapor chamber",
        },
        main_image_url:
          "https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=1200&q=85",
        is_available: true,
      },
      {
        title: "Radeon RX 7800 XT Pulse",
        description:
          "Надёжная карта для плавного 1440p-гейминга с 16 ГБ видеопамяти, усиленным охлаждением и металлической опорной пластиной.",
        price: 579,
        unit: "шт.",
        stock: 13,
        attributes: {
          memory: "16 GB GDDR6",
          architecture: "RDNA 3",
          interface: "PCIe 4.0",
          cooling: "Dual-X triple-fan",
        },
        main_image_url:
          "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=1200&q=85",
        is_available: true,
      },
      {
        title: "GeForce RTX 4060 Low-Profile",
        description:
          "Компактная видеокарта для небольших корпусов, способная обеспечить высокий FPS в Full HD и аппаратное ускорение творческих приложений.",
        price: 349,
        unit: "шт.",
        stock: 18,
        attributes: {
          memory: "8 GB GDDR6",
          architecture: "Ada Lovelace",
          form_factor: "Low-profile dual-slot",
          power: "115 W",
        },
        main_image_url:
          "https://images.unsplash.com/photo-1591488320449-011701bb6704?auto=format&fit=crop&w=1200&q=85",
        is_available: true,
      },
      {
        title: "Radeon RX 7900 XTX Creator",
        description:
          "Флагманская графика AMD для высокодетализированного 4K-гейминга и многопоточных рабочих нагрузок с большим запасом видеопамяти.",
        price: 1049,
        unit: "шт.",
        stock: 5,
        attributes: {
          memory: "24 GB GDDR6",
          architecture: "RDNA 3",
          stream_processors: "6,144",
          cooling: "Triple-fan axial",
        },
        main_image_url:
          "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?auto=format&fit=crop&w=1200&q=85",
        is_available: true,
      },
    ],
  },
  {
    name: "Мониторы & Экраны",
    slug: "monitors",
    image_url:
      "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=1200&q=85",
    options: {
      size: ["27 дюймов", "32 дюйма"],
      stand: ["Standard", "Ergonomic"],
    },
    extraProduct: {
      title: "Night City OLED 32",
      description:
        "Премиальный игровой OLED-монитор с глубоким чёрным цветом, высокой частотой обновления и точной заводской калибровкой для игр и создания контента.",
      price: 1099,
      unit: "шт.",
      stock: 6,
      attributes: {
        resolution: "3840×2160",
        frequency: "240Hz",
        panel: "QD-OLED",
        response_time: "0.03 ms",
        hdr: "DisplayHDR True Black 400",
      },
      main_image_url:
        "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=1200&q=85",
      is_available: true,
    },
    products: [
      {
        title: "Curved Gaming Monitor 34",
        description:
          "Изогнутый ультраширокий дисплей с высокой частотой обновления и насыщенной HDR-картинкой.",
        price: 799,
        unit: "шт.",
        stock: 11,
        attributes: {
          resolution: "3440×1440",
          frequency: "240Hz",
          panel: "QD-OLED",
          curvature: "1800R",
        },
        main_image_url:
          "https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?auto=format&fit=crop&w=1200&q=85",
        is_available: true,
      },
      {
        title: "CyberView 27 4K",
        description:
          "Профессиональный 4K IPS-монитор для игр, дизайна и работы с цветом.",
        price: 549,
        unit: "шт.",
        stock: 14,
        attributes: {
          resolution: "3840×2160",
          frequency: "160Hz",
          panel: "Fast IPS",
          color_gamut: "DCI-P3 98%",
        },
        main_image_url:
          "https://images.unsplash.com/photo-1585792180666-f7347c490ee2?auto=format&fit=crop&w=1200&q=85",
        is_available: true,
      },
      {
        title: "Portable OLED Display",
        description:
          "Лёгкий внешний OLED-экран с тонкими рамками для ноутбука и консоли.",
        price: 329,
        unit: "шт.",
        stock: 16,
        attributes: {
          resolution: "2560×1600",
          frequency: "120Hz",
          panel: "OLED",
          size: "16 дюймов",
        },
        main_image_url:
          "https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?auto=format&fit=crop&w=1200&q=85",
        is_available: true,
      },
    ],
  },
  {
    name: "Девайсы & Аудио",
    slug: "audio-mice",
    image_url:
      "https://images.unsplash.com/photo-1527814050087-3793815479db?auto=format&fit=crop&w=1200&q=85",
    options: {
      color: ["Neon Red", "Cyber Blue", "Graphite"],
      connection: ["2.4 GHz", "Bluetooth"],
    },
    extraProduct: {
      title: "EchoStrike ANC Headphones",
      description:
        "Беспроводные полноразмерные наушники с адаптивным шумоподавлением, пространственным игровым звуком и автономностью до 50 часов.",
      price: 249,
      unit: "шт.",
      stock: 15,
      attributes: {
        audio: "Hi-Res Spatial Audio",
        noise_cancelling: "Adaptive ANC",
        battery: "До 50 часов",
        microphone: "Beamforming",
      },
      main_image_url:
        "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=1200&q=85",
      is_available: true,
    },
    products: [
      {
        title: "Wireless RGB Mouse",
        description:
          "Лёгкая беспроводная мышь с точным сенсором, сменными накладками и RGB-подсветкой.",
        price: 99,
        unit: "шт.",
        stock: 28,
        attributes: {
          sensor: "26,000 DPI",
          connection: "2.4 GHz / Bluetooth",
          weight: "59 g",
          backlight: "RGB",
        },
        main_image_url:
          "https://images.unsplash.com/photo-1527814050087-3793815479db?auto=format&fit=crop&w=1200&q=85",
        is_available: true,
      },
      {
        title: "Nightwave Wireless Headset",
        description:
          "Игровая гарнитура с объёмным звуком, съёмным микрофоном и мягкими амбушюрами.",
        price: 179,
        unit: "шт.",
        stock: 21,
        attributes: {
          audio: "7.1 Surround",
          connection: "2.4 GHz / Bluetooth",
          battery: "40 часов",
          microphone: "Съёмный",
        },
        main_image_url:
          "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?auto=format&fit=crop&w=1200&q=85",
        is_available: true,
      },
      {
        title: "Pulse Studio Speakers",
        description:
          "Компактная пара активных колонок с чистым стереозвуком и входом USB-C.",
        price: 229,
        unit: "пара",
        stock: 9,
        attributes: {
          power: "80 W",
          connection: "USB-C / Bluetooth",
          frequency: "55 Hz – 20 kHz",
          finish: "Graphite",
        },
        main_image_url:
          "https://images.unsplash.com/photo-1545454675-3531b543be5d?auto=format&fit=crop&w=1200&q=85",
        is_available: true,
      },
    ],
  },
  {
    name: "Кибер-Одежда",
    slug: "cyberwear",
    image_url:
      "https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?auto=format&fit=crop&w=1200&q=85",
    options: {
      size: ["S", "M", "L", "XL"],
      color: ["Neon Black", "Signal Red"],
    },
    extraProduct: {
      title: "Neon Runner Tech Jacket",
      description:
        "Лёгкая городская куртка из ветроустойчивой ткани с водоотталкивающим покрытием, скрытыми карманами и съёмными светоотражающими панелями.",
      price: 189,
      unit: "шт.",
      stock: 17,
      attributes: {
        material: "Recycled ripstop nylon",
        water_resistance: "DWR coating",
        details: "Reflective modular panels",
      },
      main_image_url:
        "https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?auto=format&fit=crop&w=1200&q=85",
      is_available: true,
    },
    products: [
      {
        title: "Circuit Shell Windbreaker",
        description:
          "Технологичная ветровка для города и поездок: дышащая мембрана защищает от ветра и лёгкого дождя, а светоотражающие элементы заметны в ночном свете.",
        price: 149,
        unit: "шт.",
        stock: 22,
        attributes: {
          material: "3-layer softshell",
          water_resistance: "10,000 mm",
          pockets: "4 concealed pockets",
        },
        main_image_url:
          "https://images.unsplash.com/photo-1551488831-00ddcb6c6bd3?auto=format&fit=crop&w=1200&q=85",
        is_available: true,
      },
      {
        title: "Afterdark Utility Hoodie",
        description:
          "Плотное худи свободного кроя с усиленными швами, карманом для устройств и мягкой внутренней отделкой для ежедневной носки.",
        price: 89,
        unit: "шт.",
        stock: 31,
        attributes: {
          material: "Organic cotton blend",
          fit: "Relaxed",
          feature: "Hidden device pocket",
        },
        main_image_url:
          "https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=1200&q=85",
        is_available: true,
      },
      {
        title: "HoloGrid Cargo Pants",
        description:
          "Удобные карго-брюки из прочной эластичной ткани с регулируемыми манжетами и вместительными карманами для аксессуаров.",
        price: 119,
        unit: "шт.",
        stock: 14,
        attributes: {
          material: "Stretch technical twill",
          pockets: "6 utility pockets",
          fit: "Tapered",
        },
        main_image_url:
          "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&w=1200&q=85",
        is_available: true,
      },
      {
        title: "Pulse Reflective Sneakers",
        description:
          "Лёгкие кроссовки с амортизирующей подошвой и отражающими вставками для комфортных городских маршрутов.",
        price: 139,
        unit: "пара",
        stock: 20,
        attributes: {
          upper: "Breathable engineered mesh",
          sole: "Dual-density foam",
          details: "Reflective heel accents",
        },
        main_image_url:
          "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1200&q=85",
        is_available: true,
      },
    ],
  },
  {
    name: "Модули ОЗУ / SSD",
    slug: "memory-storage",
    image_url:
      "https://images.unsplash.com/photo-1562976540-1502c2145186?auto=format&fit=crop&w=1200&q=85",
    options: {
      capacity: ["1 TB", "2 TB", "4 TB"],
      heatsink: ["Graphite", "RGB Edition"],
    },
    extraProduct: {
      title: "Quantum DDR5 64GB RGB Kit",
      description:
        "Набор оперативной памяти DDR5 из двух модулей с профилями разгона, эффективным радиатором и настраиваемой адресной подсветкой.",
      price: 219,
      unit: "комплект",
      stock: 12,
      attributes: {
        capacity: "64 GB (2×32 GB)",
        frequency: "6400 MHz",
        latency: "CL32",
        backlight: "Addressable RGB",
      },
      main_image_url:
        "https://images.unsplash.com/photo-1562976540-1502c2145186?auto=format&fit=crop&w=1200&q=85",
      is_available: true,
    },
    products: [
      {
        title: "VoidCore DDR5 32GB Kit",
        description:
          "Быстрый двухканальный комплект памяти DDR5 с низкопрофильным радиатором и поддержкой профилей разгона для игровых и рабочих систем.",
        price: 119,
        unit: "комплект",
        stock: 28,
        attributes: {
          capacity: "32 GB (2×16 GB)",
          frequency: "6000 MHz",
          latency: "CL30",
          compatibility: "Intel XMP 3.0 / AMD EXPO",
        },
        main_image_url:
          "https://images.unsplash.com/photo-1562976540-1502c2145186?auto=format&fit=crop&w=1200&q=85",
        is_available: true,
      },
      {
        title: "Hyperion NVMe Gen4 2TB",
        description:
          "Высокопроизводительный NVMe SSD для игр и тяжёлых проектов: быстрый запуск приложений, контроллер с динамическим кэшированием и ресурс для интенсивной записи.",
        price: 159,
        unit: "шт.",
        stock: 25,
        attributes: {
          capacity: "2 TB",
          interface: "PCIe 4.0 ×4 NVMe",
          read_speed: "7,400 MB/s",
          write_speed: "6,800 MB/s",
        },
        main_image_url:
          "https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?auto=format&fit=crop&w=1200&q=85",
        is_available: true,
      },
      {
        title: "Spectra DDR5 16GB RGB",
        description:
          "Одиночный модуль памяти DDR5 с яркой адресной подсветкой и массивным радиатором — для апгрейда совместимых игровых платформ.",
        price: 69,
        unit: "модуль",
        stock: 34,
        attributes: {
          capacity: "16 GB",
          frequency: "5600 MHz",
          latency: "CL36",
          backlight: "RGB",
        },
        main_image_url:
          "https://images.unsplash.com/photo-1562976540-1502c2145186?auto=format&fit=crop&w=1200&q=85",
        is_available: true,
      },
      {
        title: "Nightfall NVMe Gen5 1TB",
        description:
          "Компактный SSD пятого поколения с массивным теплораспределителем для современных плат и высокоскоростных рабочих станций.",
        price: 199,
        unit: "шт.",
        stock: 10,
        attributes: {
          capacity: "1 TB",
          interface: "PCIe 5.0 ×4 NVMe",
          read_speed: "10,000 MB/s",
          cooling: "Aluminium heatsink",
        },
        main_image_url:
          "https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?auto=format&fit=crop&w=1200&q=85",
        is_available: true,
      },
    ],
  },
];

let seedRequest: Promise<boolean> | null = null;

export function seedCyberTechData(): Promise<boolean> {
  if (seedRequest) {
    return seedRequest;
  }

  seedRequest = (async () => {
    const { data: existingCategories } = await apiClient.get<Category[]>(
      "/api/v1/categories/",
    );
    const { data: existingProducts } = await apiClient.get<Product[]>(
      "/api/v1/products/",
      { params: { limit: 100, offset: 0 } },
    );
    const categoriesBySlug = new Map(
      existingCategories.map((category) => [category.slug, category]),
    );
    const productsByTitle = new Map(
      existingProducts.map((product) => [product.title, product]),
    );
    let changed = false;

    for (const seedCategory of seedCategories) {
      let category = categoriesBySlug.get(seedCategory.slug);
      if (!category) {
        const response = await apiClient.post<Category>(
          "/api/v1/categories/",
          {
            name: seedCategory.name,
            slug: seedCategory.slug,
            image_url: seedCategory.image_url,
            is_active: true,
          },
        );
        category = response.data;
        categoriesBySlug.set(category.slug, category);
        changed = true;
      }

      const categoryProducts = [...seedCategory.products, seedCategory.extraProduct];
      for (const product of categoryProducts) {
        const productPayload = {
          ...product,
          category_id: category.id,
          attributes: {
            ...(product.attributes ?? {}),
            options: seedCategory.options,
          },
        };
        const existingProduct = productsByTitle.get(product.title);

        if (!existingProduct) {
          const response = await apiClient.post<Product>(
            "/api/v1/products/",
            productPayload,
          );
          productsByTitle.set(response.data.title, response.data);
          changed = true;
        } else if (!existingProduct.attributes?.options) {
          const response = await apiClient.put<Product>(
            `/api/v1/products/${existingProduct.id}`,
            {
              attributes: {
                ...(existingProduct.attributes ?? {}),
                options: seedCategory.options,
              },
            },
          );
          productsByTitle.set(response.data.title, response.data);
          changed = true;
        }
      }
    }

    return changed;
  })();

  void seedRequest.catch(() => {
    seedRequest = null;
  });

  return seedRequest;
}
