import type { Locale } from '@/i18n/config';

export type HomeFeature = {
  title: string;
  text: string;
  icon: string;
};

export type HomeButton = {
  label: string;
  href: string;
};

export type HomeStory = {
  title: string;
  text: string;
  image: string;
};

export type HomeSeo = {
  title: string;
  description: string;
};

export type HomeContent = {
  seo: HomeSeo;
  heroTitle: string;
  heroText: string;
  heroImage: string;
  heroButtons: HomeButton[];
  primaryAction: string;
  secondaryAction: string;
  featureTitle: string;
  featureItems: HomeFeature[];
  processTitle: string;
  processItems: HomeFeature[];
  storyLeft: HomeStory;
  storyRight: HomeStory;
  teamSection: HomeStory;
};

export const defaultHomeContent: Record<Locale, HomeContent> = {
  ru: {
    seo: {
      title: 'СпівДія - кооперативная платформа прямого обмена',
      description: 'Каталог товаров и услуг, точки выдачи, логистика и админ-панель для кооператива СпівДія.',
    },
    heroTitle: 'Объединяем производителей и пайщиков напрямую',
    heroText: 'Каталог товаров и услуг, точки выдачи, складской учет и заказы в одном удобном интерфейсе.',
    heroImage: '/design/hero-bg.jpg',
    heroButtons: [],
    primaryAction: 'Стать партнером',
    secondaryAction: 'Подключить поставщика',
    featureTitle: '',
    featureItems: [
      {
        title: 'Каталог товаров',
        text: 'Продукты, услуги и фильтры по наличию на точке выдачи.',
        icon: '/design/icon-1.png',
      },
      {
        title: 'Логистика',
        text: 'Самовывоз, доставка и отправка по Украине через партнеров.',
        icon: '/design/icon-2.png',
      },
      {
        title: 'Аналитика',
        text: 'Дашборды для поставщиков, организаторов и владельца платформы.',
        icon: '/design/icon-3.png',
      },
      {
        title: 'Документы',
        text: 'Новости, договоры и внутренние материалы в одном контуре.',
        icon: '/design/icon-4.png',
      },
    ],
    processTitle: 'Как работает экосистема',
    processItems: [
      {
        title: 'Регистрация участника',
        text: 'Пайщик, поставщик или организатор подключается за несколько шагов.',
        icon: '/design/icon-5.png',
      },
      {
        title: 'Публикация товаров',
        text: 'Поставщик управляет карточками и остатками в личном кабинете.',
        icon: '/design/icon-6.png',
      },
      {
        title: 'Оформление заказа',
        text: 'Покупатель выбирает точку выдачи или доставку на дом.',
        icon: '/design/icon-1.png',
      },
      {
        title: 'Складской маршрут',
        text: 'Перемещение: производитель -> склад ПК -> точка выдачи.',
        icon: '/design/icon-2.png',
      },
      {
        title: 'Выдача и возвраты',
        text: 'Организатор фиксирует выдачу, возвраты и корректировки остатков.',
        icon: '/design/icon-3.png',
      },
      {
        title: 'Контроль админа',
        text: 'Полная видимость оборота, активности и контентных разделов.',
        icon: '/design/icon-4.png',
      },
    ],
    storyLeft: {
      title: 'Локальное сообщество и реальные точки выдачи',
      text: 'Платформа ориентирована на простую работу для аудитории 30-70 лет и разворачивается по городам Украины.',
      image: '/design/story-left.jpg',
    },
    storyRight: {
      title: 'Контент редактируется без программиста',
      text: 'Администратор управляет текстами, блоками и изображениями на каждой странице через админ-панель.',
      image: '/design/story-right.jpg',
    },
    teamSection: {
      title: 'Команда кооператива работает в едином контуре',
      text: 'Все роли видят актуальные данные, статусы заказов и изменения контента в одном рабочем пространстве.',
      image: '/design/team.jpg',
    },
  },
  uk: {
    seo: {
      title: 'СпівДія - кооперативна платформа прямого обміну',
      description: 'Каталог товарів і послуг, точки видачі, логістика та адмін-панель для кооперативу СпівДія.',
    },
    heroTitle: 'Об\'єднуємо виробників і пайовиків напряму',
    heroText: 'Каталог товарів і послуг, точки видачі, складський облік та замовлення в одному зручному інтерфейсі.',
    heroImage: '/design/hero-bg.jpg',
    heroButtons: [],
    primaryAction: 'Стати партнером',
    secondaryAction: 'Підключити постачальника',
    featureTitle: 'Ключові напрями платформи',
    featureItems: [
      {
        title: 'Каталог товарів',
        text: 'Продукти, послуги та фільтри за наявністю на точці видачі.',
        icon: '/design/icon-1.png',
      },
      {
        title: 'Логістика',
        text: 'Самовивіз, доставка і відправка по Україні через партнерів.',
        icon: '/design/icon-2.png',
      },
      {
        title: 'Аналітика',
        text: 'Дашборди для постачальників, організаторів і власника платформи.',
        icon: '/design/icon-3.png',
      },
      {
        title: 'Документи',
        text: 'Новини, договори й внутрішні матеріали в одному контурі.',
        icon: '/design/icon-4.png',
      },
    ],
    processTitle: 'Як працює екосистема',
    processItems: [
      {
        title: 'Реєстрація учасника',
        text: 'Пайовик, постачальник або організатор підключається за кілька кроків.',
        icon: '/design/icon-5.png',
      },
      {
        title: 'Публікація товарів',
        text: 'Постачальник керує картками та залишками в особистому кабінеті.',
        icon: '/design/icon-6.png',
      },
      {
        title: 'Оформлення замовлення',
        text: 'Покупець обирає точку видачі або доставку додому.',
        icon: '/design/icon-1.png',
      },
      {
        title: 'Складський маршрут',
        text: 'Переміщення: виробник -> склад ПК -> точка видачі.',
        icon: '/design/icon-2.png',
      },
      {
        title: 'Видача і повернення',
        text: 'Організатор фіксує видачу, повернення та корекції залишків.',
        icon: '/design/icon-3.png',
      },
      {
        title: 'Контроль адміна',
        text: 'Повна видимість обороту, активності та контентних розділів.',
        icon: '/design/icon-4.png',
      },
    ],
    storyLeft: {
      title: 'Локальна спільнота і реальні точки видачі',
      text: 'Платформа орієнтована на просту роботу для аудиторії 30-70 років і масштабується по містах України.',
      image: '/design/story-left.jpg',
    },
    storyRight: {
      title: 'Контент редагується без програміста',
      text: 'Адміністратор керує текстами, блоками та зображеннями на кожній сторінці через адмін-панель.',
      image: '/design/story-right.jpg',
    },
    teamSection: {
      title: 'Команда кооперативу працює в єдиному контурі',
      text: 'Усі ролі бачать актуальні дані, статуси замовлень та зміни контенту в одному робочому просторі.',
      image: '/design/team.jpg',
    },
  },
  en: {
    seo: {
      title: 'SpivDiia - cooperative direct exchange platform',
      description: 'Catalog, pickup points, logistics and content administration for the SpivDiia cooperative platform.',
    },
    heroTitle: 'Direct collaboration between producers and members',
    heroText: 'Products, services, pickup points, stock accounting, and orders in one clear interface.',
    heroImage: '/design/hero-bg.jpg',
    heroButtons: [],
    primaryAction: 'Become a partner',
    secondaryAction: 'Join as supplier',
    featureTitle: 'Core platform capabilities',
    featureItems: [
      {
        title: 'Product catalog',
        text: 'Goods, services, and stock filters by pickup location.',
        icon: '/design/icon-1.png',
      },
      {
        title: 'Logistics',
        text: 'Pickup, delivery, and nationwide shipping workflows.',
        icon: '/design/icon-2.png',
      },
      {
        title: 'Analytics',
        text: 'Dashboards for providers, organizers, and administrators.',
        icon: '/design/icon-3.png',
      },
      {
        title: 'Documents',
        text: 'News, agreements, and internal resources in one place.',
        icon: '/design/icon-4.png',
      },
    ],
    processTitle: 'How the ecosystem works',
    processItems: [
      {
        title: 'Member onboarding',
        text: 'A member, provider, or organizer joins in a few guided steps.',
        icon: '/design/icon-5.png',
      },
      {
        title: 'Listing management',
        text: 'Suppliers manage product cards and stock in their dashboard.',
        icon: '/design/icon-6.png',
      },
      {
        title: 'Order checkout',
        text: 'Customers choose a pickup point or delivery option.',
        icon: '/design/icon-1.png',
      },
      {
        title: 'Warehouse flow',
        text: 'Movement chain: producer -> cooperative warehouse -> pickup point.',
        icon: '/design/icon-2.png',
      },
      {
        title: 'Pickup and returns',
        text: 'Organizers handle delivery confirmation and return adjustments.',
        icon: '/design/icon-3.png',
      },
      {
        title: 'Admin control',
        text: 'Global visibility into turnover, activity, and content updates.',
        icon: '/design/icon-4.png',
      },
    ],
    storyLeft: {
      title: 'Local community with real pickup infrastructure',
      text: 'The platform is designed for simple daily use by audiences aged 30-70 and can scale city by city in Ukraine.',
      image: '/design/story-left.jpg',
    },
    storyRight: {
      title: 'Every page element is editable',
      text: 'Administrators can update texts, blocks, and images directly from the admin panel.',
      image: '/design/story-right.jpg',
    },
    teamSection: {
      title: 'The cooperative team works in one operational flow',
      text: 'Every role sees current data, order states, and content updates in a single workspace.',
      image: '/design/team.jpg',
    },
  },
};
