export type ApplianceItem = { id: string; name: string; defaultWatt: number; defaultHours: number };

export interface LocationConfig {
  subtypes?: Record<string, {
    label: string;
    categories: Record<string, ApplianceItem[]>;
  }>;
  common?: {
    label: string;
    categories: Record<string, ApplianceItem[]>;
  };
  categories?: Record<string, ApplianceItem[]>;
}

export const APPLIANCES_CONFIG: Record<string, LocationConfig> = {
  residential: {
    categories: {
      cooling_heating: [
        { id: "split_ac", name: "کولر گازی اسپلیت", defaultWatt: 1800, defaultHours: 8 },
        { id: "water_cooler", name: "کولر آبی", defaultWatt: 750, defaultHours: 10 },
        { id: "central_ac", name: "کولر گازی مرکزی/چیلر", defaultWatt: 5000, defaultHours: 12 },
        { id: "electric_heater", name: "بخاری برقی", defaultWatt: 2000, defaultHours: 6 },
        { id: "package_pump", name: "پکیج و پمپ گردش آب", defaultWatt: 150, defaultHours: 24 },
        { id: "ceiling_fan", name: "فن سقفی", defaultWatt: 75, defaultHours: 12 },
        { id: "electric_water_heater", name: "آبگرمکن برقی", defaultWatt: 4000, defaultHours: 3 }
      ],
      kitchen: [
        { id: "fridge", name: "یخچال‌فریزر خانگی", defaultWatt: 200, defaultHours: 24 },
        { id: "freezer", name: "فریزر مجزا", defaultWatt: 250, defaultHours: 24 },
        { id: "dishwasher", name: "ماشین ظرفشویی", defaultWatt: 1800, defaultHours: 1.5 },
        { id: "microwave", name: "مایکروویو", defaultWatt: 1200, defaultHours: 0.5 },
        { id: "electric_stove", name: "اجاق برقی", defaultWatt: 2000, defaultHours: 1 },
        { id: "air_fryer", name: "سرخ‌کن هوا", defaultWatt: 1500, defaultHours: 0.5 },
        { id: "water_dispenser", name: "آبسردکن", defaultWatt: 100, defaultHours: 24 },
        { id: "electric_kettle", name: "کتری برقی", defaultWatt: 2000, defaultHours: 0.5 },
        { id: "toaster", name: "توستر", defaultWatt: 800, defaultHours: 0.2 },
        { id: "food_processor", name: "همزن/غذاساز", defaultWatt: 300, defaultHours: 0.2 }
      ],
      cleaning_laundry: [
        { id: "washing_machine", name: "ماشین لباسشویی", defaultWatt: 2000, defaultHours: 1.5 },
        { id: "dryer", name: "خشک‌کن لباس", defaultWatt: 3000, defaultHours: 1 },
        { id: "iron", name: "اتو", defaultWatt: 1600, defaultHours: 0.5 },
        { id: "vacuum_cleaner", name: "جاروبرقی", defaultWatt: 1200, defaultHours: 0.5 }
      ],
      entertainment_office: [
        { id: "tv", name: "تلویزیون", defaultWatt: 150, defaultHours: 6 },
        { id: "desktop_pc", name: "کامپیوتر رومیزی", defaultWatt: 300, defaultHours: 4 },
        { id: "laptop", name: "لپ‌تاپ", defaultWatt: 65, defaultHours: 4 },
        { id: "router", name: "روتر و مودم", defaultWatt: 20, defaultHours: 24 },
        { id: "console", name: "کنسول بازی", defaultWatt: 150, defaultHours: 3 },
        { id: "audio_system", name: "سیستم صوتی", defaultWatt: 100, defaultHours: 2 }
      ],
      other: [
        { id: "water_pump", name: "پمپ آب خانگی", defaultWatt: 750, defaultHours: 2 },
        { id: "ev_charger", name: "شارژر خودروی برقی", defaultWatt: 3500, defaultHours: 4 },
        { id: "pool_pump", name: "استخر خانگی (پمپ و گرمکن)", defaultWatt: 2000, defaultHours: 4 },
        { id: "jacuzzi", name: "جکوزی/سونا", defaultWatt: 3000, defaultHours: 1 },
        { id: "cctv", name: "سیستم دوربین مداربسته", defaultWatt: 50, defaultHours: 24 },
        { id: "elevator", name: "آسانسور خانگی", defaultWatt: 1500, defaultHours: 0.5 }
      ]
    }
  },
  industrial_warehouse: {
    subtypes: {
      logistics: {
        label: "انبار و لجستیک",
        categories: {
          equipment: [
            { id: "w_light", name: "روشنایی صنعتی سالن (LED های‌بی)", defaultWatt: 15, defaultHours: 12 },
            { id: "w_forklift", name: "لیفتراک برقی — ایستگاه شارژ", defaultWatt: 3000, defaultHours: 4 },
            { id: "w_crane", name: "جرثقیل سقفی سبک (کرین)", defaultWatt: 4000, defaultHours: 4 },
            { id: "w_conveyor", name: "نوار نقاله انتقال بار", defaultWatt: 1500, defaultHours: 8 },
            { id: "w_dock", name: "سیستم رمپ برقی بارگیری", defaultWatt: 2200, defaultHours: 4 },
            { id: "w_cctv", name: "دوربین مداربسته و سیستم امنیتی", defaultWatt: 200, defaultHours: 24 },
            { id: "w_exhaust", name: "اگزاست فن تهویه سالن", defaultWatt: 750, defaultHours: 12 },
            { id: "w_packaging", name: "دستگاه بسته‌بندی/استرچ پالت", defaultWatt: 1500, defaultHours: 6 },
            { id: "w_scale", name: "باسکول دیجیتال صنعتی", defaultWatt: 100, defaultHours: 8 }
          ]
        }
      },
      cold_storage: {
        label: "سردخانه و انبار مواد غذایی",
        categories: {
          equipment: [
            { id: "cs_compressor", name: "کمپرسور برودتی سردخانه (متوسط)", defaultWatt: 7500, defaultHours: 16 },
            { id: "cs_chiller", name: "چیلر صنعتی کوچک", defaultWatt: 10000, defaultHours: 12 },
            { id: "cs_condenser", name: "کندانسور و فن‌های خنک‌کننده", defaultWatt: 1500, defaultHours: 16 },
            { id: "cs_door", name: "درب‌های اتوماتیک سردخانه", defaultWatt: 500, defaultHours: 2 },
            { id: "cs_control", name: "سیستم کنترل دما و رطوبت", defaultWatt: 300, defaultHours: 24 },
            { id: "cs_ice", name: "دستگاه یخ‌ساز صنعتی", defaultWatt: 2500, defaultHours: 12 },
            { id: "cs_light", name: "روشنایی ضد‌رطوبت سردخانه", defaultWatt: 10, defaultHours: 12 }
          ]
        }
      },
      woodworking: {
        label: "نجاری و صنایع چوب",
        categories: {
          equipment: [
            { id: "wd_saw", name: "اره گرد صنعتی (پنل‌بر)", defaultWatt: 4000, defaultHours: 6 },
            { id: "wd_milling", name: "دستگاه رنده و فرز چوب", defaultWatt: 3000, defaultHours: 6 },
            { id: "wd_press", name: "پرس چوب/ممبران", defaultWatt: 5500, defaultHours: 4 },
            { id: "wd_cnc", name: "دستگاه CNC چوب", defaultWatt: 7500, defaultHours: 8 },
            { id: "wd_dust", name: "سیستم مکش براده و غبارگیر صنعتی", defaultWatt: 4000, defaultHours: 8 },
            { id: "wd_compressor", name: "کمپرسور هوا (برای رنگ‌پاش/پرداخت)", defaultWatt: 3700, defaultHours: 6 },
            { id: "wd_dryer", name: "اتاق رنگ/کوره خشک‌کن رنگ چوب", defaultWatt: 9000, defaultHours: 4 }
          ]
        }
      },
      metalworking: {
        label: "فلزکاری، جوشکاری و آهنگری سبک",
        categories: {
          equipment: [
            { id: "mw_inverter", name: "دستگاه جوش اینورتری", defaultWatt: 4000, defaultHours: 4 },
            { id: "mw_welding", name: "دستگاه جوش معمولی (ترانسی)", defaultWatt: 7000, defaultHours: 4 },
            { id: "mw_plasma", name: "دستگاه برش پلاسما", defaultWatt: 5500, defaultHours: 4 },
            { id: "mw_laser", name: "دستگاه برش لیزر فلز (کوچک)", defaultWatt: 12000, defaultHours: 4 },
            { id: "mw_milling", name: "فرز و تراش صنعتی", defaultWatt: 3700, defaultHours: 6 },
            { id: "mw_press", name: "پرس بادی/هیدرولیک سبک", defaultWatt: 5500, defaultHours: 4 },
            { id: "mw_compressor", name: "کمپرسور هوای صنعتی", defaultWatt: 5500, defaultHours: 6 },
            { id: "mw_drill", name: "دریل پرس صنعتی", defaultWatt: 1500, defaultHours: 4 }
          ]
        }
      },
      automotive: {
        label: "تعمیرگاه و خدمات خودرو/ماشین‌آلات سنگین",
        categories: {
          equipment: [
            { id: "au_lift", name: "جک هیدرولیک برقی/بالابر خودرو", defaultWatt: 3000, defaultHours: 2 },
            { id: "au_compressor", name: "کمپرسور باد تعمیرگاهی", defaultWatt: 4000, defaultHours: 4 },
            { id: "au_balance", name: "دستگاه تنظیم چرخ و بالانس", defaultWatt: 1500, defaultHours: 2 },
            { id: "au_charger", name: "دستگاه شارژ باتری صنعتی", defaultWatt: 2000, defaultHours: 4 },
            { id: "au_welding", name: "دستگاه جوش تعمیراتی", defaultWatt: 4000, defaultHours: 2 },
            { id: "au_carwash", name: "کارواش صنعتی/واترجت", defaultWatt: 3000, defaultHours: 4 },
            { id: "au_light", name: "روشنایی تعمیرگاه", defaultWatt: 12, defaultHours: 10 }
          ]
        }
      },
      printing: {
        label: "چاپ و بسته‌بندی",
        categories: {
          equipment: [
            { id: "pr_offset", name: "دستگاه چاپ افست/دیجیتال صنعتی", defaultWatt: 8000, defaultHours: 8 },
            { id: "pr_label", name: "دستگاه لیبل‌زنی و برچسب‌گذاری", defaultWatt: 1500, defaultHours: 6 },
            { id: "pr_shrink", name: "دستگاه بسته‌بندی حرارتی (شیرینگ)", defaultWatt: 3000, defaultHours: 6 },
            { id: "pr_folder", name: "دستگاه کارتن‌سازی/فولدر گلوئر", defaultWatt: 4000, defaultHours: 6 },
            { id: "pr_compressor", name: "کمپرسور هوای دستگاه‌های چاپ", defaultWatt: 3700, defaultHours: 8 },
            { id: "pr_uv", name: "سیستم خشک‌کن UV چاپ", defaultWatt: 5500, defaultHours: 6 }
          ]
        }
      },
      textile: {
        label: "نساجی و پوشاک سبک",
        categories: {
          equipment: [
            { id: "tx_sewing", name: "ماشین‌های دوخت صنعتی (هر دستگاه)", defaultWatt: 370, defaultHours: 8 },
            { id: "tx_cutting", name: "دستگاه برش پارچه اتوماتیک", defaultWatt: 1500, defaultHours: 4 },
            { id: "tx_iron", name: "دستگاه اتوی بخار صنعتی", defaultWatt: 2500, defaultHours: 6 },
            { id: "tx_print", name: "دستگاه چاپ روی پارچه", defaultWatt: 4000, defaultHours: 6 },
            { id: "tx_conveyor", name: "نوار نقاله خط تولید پوشاک", defaultWatt: 1500, defaultHours: 8 },
            { id: "tx_boiler", name: "کمپرسور بخار (دیگ بخار کوچک)", defaultWatt: 9000, defaultHours: 8 }
          ]
        }
      },
      recycling: {
        label: "پلاستیک و بازیافت سبک",
        categories: {
          equipment: [
            { id: "rc_grinder", name: "دستگاه آسیاب پلاستیک", defaultWatt: 7500, defaultHours: 6 },
            { id: "rc_washing", name: "دستگاه شست‌وشوی پلاستیک بازیافتی", defaultWatt: 3700, defaultHours: 6 },
            { id: "rc_extruder", name: "اکسترودر کوچک بازیافت", defaultWatt: 15000, defaultHours: 8 },
            { id: "rc_baler", name: "پرس بسته‌بندی ضایعات (بیلر)", defaultWatt: 5500, defaultHours: 4 },
            { id: "rc_conveyor", name: "نوار نقاله تفکیک زباله", defaultWatt: 1500, defaultHours: 8 }
          ]
        }
      }
    },
    common: {
      label: "تجهیزات عمومی مشترک بین همه سوله‌ها",
      categories: {
        common: [
          { id: "wc_panel", name: "تابلو برق و کلیدهای اصلی", defaultWatt: 500, defaultHours: 24 },
          { id: "wc_fire", name: "سیستم اعلام و اطفا حریق", defaultWatt: 200, defaultHours: 24 },
          { id: "wc_exhaust", name: "سیستم تهویه/اگزاست عمومی", defaultWatt: 750, defaultHours: 12 },
          { id: "wc_cctv", name: "دوربین‌های امنیتی و دزدگیر", defaultWatt: 200, defaultHours: 24 },
          { id: "wc_charger", name: "ایستگاه شارژ باتری تجهیزات", defaultWatt: 2000, defaultHours: 4 }
        ]
      }
    }
  },
  factory: {
    subtypes: {
      food: {
        label: "صنایع غذایی",
        categories: {
          equipment: [
            { id: "ff_filler", name: "خط تولید و پرکن اتوماتیک", defaultWatt: 15000, defaultHours: 12 },
            { id: "ff_mixer", name: "میکسر/همزن صنعتی بزرگ", defaultWatt: 7500, defaultHours: 8 },
            { id: "ff_oven", name: "فر و کوره پخت صنعتی", defaultWatt: 25000, defaultHours: 10 },
            { id: "ff_pasteurizer", name: "دستگاه پاستوریزاسیون", defaultWatt: 18000, defaultHours: 8 },
            { id: "ff_freezer", name: "سردخانه و تونل انجماد", defaultWatt: 25000, defaultHours: 16 },
            { id: "ff_vacuum", name: "دستگاه بسته‌بندی وکیوم صنعتی", defaultWatt: 4000, defaultHours: 8 },
            { id: "ff_washing", name: "خط شست‌وشو و ضدعفونی", defaultWatt: 5500, defaultHours: 6 },
            { id: "ff_boiler", name: "بویلر بخار صنعتی", defaultWatt: 30000, defaultHours: 12 }
          ]
        }
      },
      metal: {
        label: "فلزی و ماشین‌سازی",
        categories: {
          equipment: [
            { id: "fm_cnc", name: "دستگاه CNC صنعتی", defaultWatt: 7500, defaultHours: 12 },
            { id: "fm_press", name: "پرس صنعتی سنگین", defaultWatt: 20000, defaultHours: 8 },
            { id: "fm_furnace", name: "کوره ذوب/عملیات حرارتی فلز", defaultWatt: 30000, defaultHours: 12 },
            { id: "fm_robot", name: "ربات جوش خط تولید", defaultWatt: 5000, defaultHours: 12 },
            { id: "fm_galvanize", name: "دستگاه گالوانیزه/آبکاری", defaultWatt: 25000, defaultHours: 8 },
            { id: "fm_compressor", name: "کمپرسور صنعتی بزرگ", defaultWatt: 15000, defaultHours: 12 },
            { id: "fm_crane", name: "جرثقیل سقفی سنگین", defaultWatt: 10000, defaultHours: 4 },
            { id: "fm_bending", name: "دستگاه خم و برش ورق CNC", defaultWatt: 11000, defaultHours: 8 }
          ]
        }
      },
      plastic: {
        label: "پلاستیک و پلیمر",
        categories: {
          equipment: [
            { id: "fp_injection", name: "دستگاه تزریق پلاستیک (کوچک تا متوسط)", defaultWatt: 25000, defaultHours: 16 },
            { id: "fp_extrusion", name: "دستگاه اکستروژن لوله/پروفیل", defaultWatt: 25000, defaultHours: 16 },
            { id: "fp_blow", name: "دستگاه بادکنی (Blow Molding)", defaultWatt: 20000, defaultHours: 16 },
            { id: "fp_grinder", name: "آسیاب و گرانول‌ساز پلاستیک", defaultWatt: 11000, defaultHours: 8 },
            { id: "fp_chiller", name: "چیلر خنک‌کننده قالب", defaultWatt: 18000, defaultHours: 16 },
            { id: "fp_compressor", name: "کمپرسور هوای خط تولید", defaultWatt: 15000, defaultHours: 16 }
          ]
        }
      },
      chemical: {
        label: "شیمیایی و پتروشیمی سبک",
        categories: {
          equipment: [
            { id: "fc_reactor", name: "راکتور شیمیایی برقی", defaultWatt: 30000, defaultHours: 12 },
            { id: "fc_pump", name: "پمپ انتقال مواد شیمیایی", defaultWatt: 7500, defaultHours: 12 },
            { id: "fc_mixer", name: "میکسر صنعتی مواد شیمیایی", defaultWatt: 11000, defaultHours: 8 },
            { id: "fc_filter", name: "سیستم تصفیه و فیلتراسیون", defaultWatt: 15000, defaultHours: 12 },
            { id: "fc_exhaust", name: "سیستم تهویه ایمنی (Exhaust) با موتور قوی", defaultWatt: 5500, defaultHours: 24 },
            { id: "fc_packaging", name: "دستگاه بسته‌بندی مواد شیمیایی", defaultWatt: 4000, defaultHours: 8 }
          ]
        }
      },
      textile: {
        label: "نساجی و پوشاک (مقیاس کارخانه)",
        categories: {
          equipment: [
            { id: "ft_weaving", name: "ماشین‌آلات بافندگی صنعتی (هر دستگاه)", defaultWatt: 2200, defaultHours: 16 },
            { id: "ft_dyeing", name: "دستگاه رنگرزی پارچه", defaultWatt: 18000, defaultHours: 12 },
            { id: "ft_print", name: "دستگاه چاپ دیجیتال روی پارچه صنعتی", defaultWatt: 7500, defaultHours: 12 },
            { id: "ft_dryer", name: "خشک‌کن صنعتی پارچه", defaultWatt: 15000, defaultHours: 12 },
            { id: "ft_iron", name: "خط تکمیل و اتوی صنعتی", defaultWatt: 9000, defaultHours: 8 }
          ]
        }
      },
      dairy: {
        label: "لبنیات",
        categories: {
          equipment: [
            { id: "fd_homogenizer", name: "دستگاه هموژنایزر شیر", defaultWatt: 11000, defaultHours: 8 },
            { id: "fd_line", name: "خط تولید ماست/پنیر", defaultWatt: 15000, defaultHours: 8 },
            { id: "fd_tank", name: "تانک‌های نگهداری با همزن برقی", defaultWatt: 5500, defaultHours: 12 },
            { id: "fd_packaging", name: "دستگاه بسته‌بندی لبنیات", defaultWatt: 4000, defaultHours: 8 },
            { id: "fd_cold", name: "سردخانه و اتاق سرد لبنیات", defaultWatt: 20000, defaultHours: 24 },
            { id: "fd_boiler", name: "بویلر بخار پاستوریزاسیون", defaultWatt: 25000, defaultHours: 12 }
          ]
        }
      },
      pharma: {
        label: "داروسازی و بهداشتی",
        categories: {
          equipment: [
            { id: "fph_tablet", name: "دستگاه قرص‌زنی/کپسول‌پرکنی", defaultWatt: 7500, defaultHours: 8 },
            { id: "fph_blister", name: "خط بسته‌بندی بلیستر", defaultWatt: 5500, defaultHours: 8 },
            { id: "fph_cleanroom", name: "اتاق تمیز (Clean Room) — تهویه و فیلتراسیون HEPA", defaultWatt: 18000, defaultHours: 24 },
            { id: "fph_autoclave", name: "اتوکلاو و استریلایزر", defaultWatt: 11000, defaultHours: 8 },
            { id: "fph_water", name: "سیستم آب دیونیزه/تصفیه دارویی", defaultWatt: 9000, defaultHours: 12 }
          ]
        }
      },
      cement: {
        label: "سیمان، آجر و مصالح ساختمانی",
        categories: {
          equipment: [
            { id: "fce_mill", name: "آسیاب مواد اولیه", defaultWatt: 30000, defaultHours: 16 },
            { id: "fce_kiln", name: "کوره پخت آجر/سیمان", defaultWatt: 40000, defaultHours: 24 },
            { id: "fce_conveyor", name: "نوار نقاله انتقال مواد سنگین", defaultWatt: 7500, defaultHours: 12 },
            { id: "fce_press", name: "پرس بلوک و آجر", defaultWatt: 18000, defaultHours: 10 },
            { id: "fce_dust", name: "سیستم غبارگیر صنعتی سنگین", defaultWatt: 11000, defaultHours: 16 }
          ]
        }
      },
      ceramic: {
        label: "کاشی، سرامیک و شیشه",
        categories: {
          equipment: [
            { id: "fcr_kiln", name: "کوره پخت کاشی/سرامیک", defaultWatt: 40000, defaultHours: 24 },
            { id: "fcr_press", name: "پرس هیدرولیک کاشی", defaultWatt: 25000, defaultHours: 12 },
            { id: "fcr_glaze", name: "خط لعاب‌زنی و رنگ‌آمیزی", defaultWatt: 9000, defaultHours: 12 },
            { id: "fcr_cutter", name: "دستگاه برش و پرداخت سرامیک", defaultWatt: 7500, defaultHours: 8 },
            { id: "fcr_glass", name: "کوره ذوب شیشه", defaultWatt: 50000, defaultHours: 24 }
          ]
        }
      },
      wood: {
        label: "چوب، MDF و نئوپان",
        categories: {
          equipment: [
            { id: "fwd_press", name: "پرس تولید MDF/نئوپان", defaultWatt: 30000, defaultHours: 12 },
            { id: "fwd_mill", name: "دستگاه خردکن و آسیاب چوب", defaultWatt: 18000, defaultHours: 12 },
            { id: "fwd_laminate", name: "خط روکش و لمینت", defaultWatt: 11000, defaultHours: 8 },
            { id: "fwd_dryer", name: "کوره خشک‌کن چوب صنعتی", defaultWatt: 20000, defaultHours: 16 },
            { id: "fwd_dust", name: "سیستم مکش براده صنعتی بزرگ", defaultWatt: 9000, defaultHours: 16 }
          ]
        }
      },
      electronics: {
        label: "الکترونیک و مونتاژ",
        categories: {
          equipment: [
            { id: "fel_smt", name: "خط مونتاژ SMT/PCB", defaultWatt: 7500, defaultHours: 12 },
            { id: "fel_reflow", name: "کوره ریفلو (Reflow Oven)", defaultWatt: 9000, defaultHours: 12 },
            { id: "fel_solder", name: "ایستگاه لحیم‌کاری صنعتی (هر ایستگاه)", defaultWatt: 150, defaultHours: 8 },
            { id: "fel_test", name: "تست و کنترل کیفیت اتوماتیک", defaultWatt: 2000, defaultHours: 8 },
            { id: "fel_esd", name: "اتاق ESD با تهویه کنترل‌شده", defaultWatt: 3700, defaultHours: 24 }
          ]
        }
      }
    },
    common: {
      label: "تجهیزات عمومی مشترک بین کارخانه‌ها",
      categories: {
        common: [
          { id: "fc_light", name: "روشنایی صنعتی کل سالن تولید", defaultWatt: 18, defaultHours: 12 },
          { id: "fc_office", name: "تجهیزات اداری دفتر مرکزی کارخانه", defaultWatt: 2000, defaultHours: 8 },
          { id: "fc_fire", name: "سیستم اطفا حریق پیشرفته", defaultWatt: 1000, defaultHours: 24 },
          { id: "fc_water", name: "تصفیه‌خانه آب صنعتی", defaultWatt: 10000, defaultHours: 24 },
          { id: "fc_hvac", name: "سیستم تهویه مطبوع مرکزی", defaultWatt: 20000, defaultHours: 12 }
        ]
      }
    }
  },
  agricultural: {
    subtypes: {
      farming: {
        label: "زراعت آبی (مزارع سنتی/مکانیزه)",
        categories: {
          equipment: [
            { id: "ag_surface", name: "پمپ آب سطحی", defaultWatt: 3000, defaultHours: 6 },
            { id: "ag_submersible", name: "پمپ آب عمیق/شناور", defaultWatt: 7500, defaultHours: 8 },
            { id: "ag_deep", name: "پمپ چاه عمیق صنعتی", defaultWatt: 15000, defaultHours: 12 },
            { id: "ag_rain", name: "سیستم آبیاری بارانی (پمپ + موتور)", defaultWatt: 5500, defaultHours: 6 },
            { id: "ag_drip", name: "سیستم آبیاری قطره‌ای (پمپ + کنترلر)", defaultWatt: 1500, defaultHours: 6 },
            { id: "ag_pivot", name: "سیستم آبیاری سنتر پیوت (Center Pivot)", defaultWatt: 11000, defaultHours: 8 },
            { id: "ag_panel", name: "تابلو کنترل و تایمر آبیاری هوشمند", defaultWatt: 300, defaultHours: 24 }
          ]
        }
      },
      greenhouse: {
        label: "گلخانه",
        categories: {
          equipment: [
            { id: "gh_heat", name: "سیستم گرمایش گلخانه", defaultWatt: 10000, defaultHours: 12 },
            { id: "gh_cool", name: "سیستم سرمایش تبخیری", defaultWatt: 3000, defaultHours: 10 },
            { id: "gh_fan", name: "فن‌های تهویه گلخانه (هر فن)", defaultWatt: 750, defaultHours: 12 },
            { id: "gh_light", name: "روشنایی مکمل رشد گیاه", defaultWatt: 20, defaultHours: 6 },
            { id: "gh_drip", name: "سیستم آبیاری قطره‌ای/میست خودکار", defaultWatt: 1500, defaultHours: 4 },
            { id: "gh_control", name: "سیستم کنترل اقلیم", defaultWatt: 500, defaultHours: 24 },
            { id: "gh_motor", name: "موتور بازکن سقف/پرده حرارتی", defaultWatt: 1100, defaultHours: 2 }
          ]
        }
      },
      orchard: {
        label: "باغداری (میوه/باغات بزرگ)",
        categories: {
          equipment: [
            { id: "or_drip", name: "پمپ آبیاری قطره‌ای باغ", defaultWatt: 3700, defaultHours: 6 },
            { id: "or_frost", name: "سیستم ضد‌یخ باغ (فن یا اسپرینکلر)", defaultWatt: 5500, defaultHours: 4 },
            { id: "or_prune", name: "دستگاه هرس برقی/اره باغبانی (شارژر)", defaultWatt: 500, defaultHours: 2 },
            { id: "or_cold", name: "سردخانه محصول باغی", defaultWatt: 7500, defaultHours: 24 },
            { id: "or_pack", name: "دستگاه بسته‌بندی و درجه‌بندی میوه", defaultWatt: 2000, defaultHours: 6 }
          ]
        }
      },
      poultry: {
        label: "مرغداری (گوشتی یا تخم‌گذار)",
        categories: {
          equipment: [
            { id: "po_light", name: "سیستم روشنایی سالن مرغداری", defaultWatt: 8, defaultHours: 16 },
            { id: "po_fan", name: "سیستم تهویه/فن سالن (هر فن)", defaultWatt: 1500, defaultHours: 24 },
            { id: "po_pad", name: "سیستم خنک‌کننده تبخیری (کولینگ پد)", defaultWatt: 2200, defaultHours: 12 },
            { id: "po_feed", name: "دستگاه خوراک‌دهی خودکار", defaultWatt: 1000, defaultHours: 4 },
            { id: "po_water", name: "دستگاه آب‌دهی اتوماتیک", defaultWatt: 500, defaultHours: 4 },
            { id: "po_heat", name: "سیستم گرمایش جوجه (بخاری/براودر)", defaultWatt: 5500, defaultHours: 24 },
            { id: "po_egg", name: "دستگاه جمع‌آوری خودکار تخم", defaultWatt: 1500, defaultHours: 2 },
            { id: "po_control", name: "سیستم کنترل هوشمند اقلیم سالن", defaultWatt: 500, defaultHours: 24 }
          ]
        }
      },
      livestock: {
        label: "دامداری و گاوداری (شیری/گوشتی)",
        categories: {
          equipment: [
            { id: "lv_milk", name: "دستگاه شیردوش اتوماتیک", defaultWatt: 3700, defaultHours: 4 },
            { id: "lv_cool", name: "سیستم سرمایش شیر (تانک خنک‌کن)", defaultWatt: 5500, defaultHours: 12 },
            { id: "lv_fan", name: "سیستم تهویه سالن دام (هر فن)", defaultWatt: 1500, defaultHours: 12 },
            { id: "lv_feed", name: "دستگاه خوراک‌دهی و میکسر خوراک دام (TMR)", defaultWatt: 7500, defaultHours: 4 },
            { id: "lv_light", name: "سیستم روشنایی سالن دامداری", defaultWatt: 6, defaultHours: 10 },
            { id: "lv_wash", name: "سیستم شست‌وشو و ضدعفونی سالن", defaultWatt: 3000, defaultHours: 2 },
            { id: "lv_dung", name: "دستگاه جمع‌آوری کود مکانیزه", defaultWatt: 2200, defaultHours: 2 }
          ]
        }
      },
      aquaculture: {
        label: "آبزی‌پروری/پرورش ماهی",
        categories: {
          equipment: [
            { id: "aq_air", name: "پمپ هوادهی استخر (ایرلیفت/بلوور)", defaultWatt: 3700, defaultHours: 24 },
            { id: "aq_pump", name: "پمپ تعویض و گردش آب", defaultWatt: 5500, defaultHours: 24 },
            { id: "aq_filter", name: "سیستم فیلتراسیون و تصفیه آب", defaultWatt: 4000, defaultHours: 24 },
            { id: "aq_feed", name: "دستگاه خوراک‌دهی خودکار ماهی", defaultWatt: 1000, defaultHours: 4 },
            { id: "aq_control", name: "سیستم کنترل اکسیژن و دمای آب", defaultWatt: 500, defaultHours: 24 },
            { id: "aq_heat", name: "سیستم گرمایش استخر (در اقلیم سرد)", defaultWatt: 10000, defaultHours: 12 }
          ]
        }
      },
      storage: {
        label: "انبار و سردخانه محصولات کشاورزی",
        categories: {
          equipment: [
            { id: "st_cold", name: "سردخانه محصولات کشاورزی", defaultWatt: 7500, defaultHours: 24 },
            { id: "st_dry", name: "دستگاه خشک‌کن محصولات", defaultWatt: 5000, defaultHours: 8 },
            { id: "st_mill", name: "موتور آسیاب/خردکن علوفه", defaultWatt: 3700, defaultHours: 4 },
            { id: "st_pack", name: "دستگاه بسته‌بندی و درجه‌بندی محصولات", defaultWatt: 2000, defaultHours: 6 },
            { id: "st_humidity", name: "سیستم کنترل رطوبت انبار غلات", defaultWatt: 1500, defaultHours: 24 },
            { id: "st_conveyor", name: "بالابر و نوار نقاله انبار", defaultWatt: 1500, defaultHours: 4 }
          ]
        }
      }
    },
    common: {
      label: "تجهیزات عمومی مشترک زمین کشاورزی",
      categories: {
        common: [
          { id: "ac_light", name: "سیستم روشنایی محوطه و امنیتی", defaultWatt: 200, defaultHours: 12 },
          { id: "ac_panel", name: "تابلو برق و کنترل مرکزی مزرعه", defaultWatt: 300, defaultHours: 24 },
          { id: "ac_charger", name: "ایستگاه شارژ تجهیزات برقی/باتری‌دار", defaultWatt: 2000, defaultHours: 4 }
        ]
      }
    }
  }
};
