// Dictionary-based i18n for the folder management UI.
// Add new keys here, in both English and Arabic, then call t("key") from
// components via the useT() hook.

const en = {
  // App / shell
  "app.title": "Clips",
  "app.startTrial": "Start Trial",
  "library": "Library",
  "settings": "Settings",
  "theme": "Theme",
  "theme.dark": "Dark",
  "theme.light": "Light",
  "language": "Language",
  "language.en": "English",
  "language.ar": "العربية",
  "accent": "Accent",
  "density": "Density",
  "density.compact": "Compact",
  "density.cozy": "Cozy",
  "density.spacious": "Spacious",
  "reduceMotion": "Reduce motion",
  "reduceMotion.desc": "Tone down animations",

  // Toolbar
  "toolbar.searchPlaceholder": "Search folders, tags, files...",
  "toolbar.favorites": "Favorites",
  "toolbar.filter": "Filter",
  "toolbar.sort": "Sort",
  "toolbar.searchAll": "Search all",
  "toolbar.template": "Template",
  "toolbar.new": "New",
  "toolbar.tags": "Tags",
  "toolbar.clear": "Clear",

  // Sidebar
  "sidebar.newFromTemplate": "New from template",
  "sidebar.search": "Search",
  "sidebar.duplicates": "Duplicates",
  "sidebar.heatmap": "Heatmap",
  "sidebar.libraryRename": "Rename",
  "sidebar.export": "Export",
  "sidebar.import": "Import",
  "sidebar.shortcuts": "Keyboard shortcuts",
  "sidebar.smart": "Smart",
  "sidebar.savedSearches": "Saved searches",
  "sidebar.favorites": "Favorites",
  "sidebar.recent": "Recent",
  "sidebar.allFolders": "All folders",
  "sidebar.trash": "Trash",
  "sidebar.reopen": "Reopen {name}",

  // Filters
  "filter.all": "All folders",
  "filter.favorites": "Favorites only",
  "filter.nonEmpty": "Has items",
  "filter.empty": "Empty only",
  "filter.withImages": "With images",

  // Sort
  "sort.newestFirst": "Newest first",
  "sort.oldestFirst": "Oldest first",
  "sort.recentlyUpdated": "Recently updated",
  "sort.nameAsc": "Name A → Z",
  "sort.nameDesc": "Name Z → A",
  "sort.mostItems": "Most items",

  // Folder dialog
  "folder.itemCount": "{count} items",
  "folder.itemCountOne": "{count} item",
  "folder.created": "Created {date}",
  "folder.updated": "Updated {date}",
  "folder.favorite": "Favorite",
  "folder.favorited": "Favorited",
  "folder.pin": "Pin",
  "folder.pinned": "Pinned",
  "folder.decorate": "Decorate",
  "folder.duplicate": "Duplicate",
  "folder.move": "Move",
  "folder.share": "Share",
  "folder.shared": "Shared",
  "folder.slideshow": "Slideshow",
  "folder.aiDescribe": "AI describe",
  "folder.suggestCover": "Suggest cover",
  "folder.lock": "Lock",
  "folder.locked": "Locked",
  "folder.delete": "Delete",
  "folder.addDescription": "Add a description...",
  "folder.addTags": "Add tags...",
  "folder.searchInside": "Search inside this folder...",
  "folder.subfolder": "Subfolder",
  "folder.subfolders": "Subfolders ({count})",
  "folder.files": "Files ({count})",
  "folder.noFilesYet": "No files yet — upload some above.",
  "folder.noFilesMatch": "No files match your filters.",
  "folder.selectAll": "Select all",
  "folder.deselectAll": "Deselect all",

  // Tabs
  "tab.files": "Files",
  "tab.notes": "Notes",
  "tab.activity": "Activity",

  // Bulk actions
  "bulk.selected": "{n} selected",
  "bulk.favorite": "Favorite",
  "bulk.rename": "Rename",
  "bulk.edit": "Edit",
  "bulk.compare": "Compare",
  "bulk.move": "Move",
  "bulk.delete": "Delete",
  "bulk.clear": "Clear",

  // View modes
  "view.grid": "Grid",
  "view.list": "List",
  "view.calendar": "Calendar",
  "view.map": "Map",

  // Trash
  "trash.title": "Trash",
  "trash.subtitle": "{count} folders in trash. Restore anytime.",
  "trash.empty": "Trash is empty.",
  "trash.emptyDesc": "Deleted folders show up here.",
  "trash.emptyButton": "Empty trash",
  "trash.restore": "Restore",
  "trash.permanent": "Forever",
  "trash.confirmEmpty": "Empty trash?",

  // Generic actions
  "action.cancel": "Cancel",
  "action.save": "Save",
  "action.create": "Create",
  "action.apply": "Apply",
  "action.close": "Close",
  "action.confirm": "Confirm",
  "action.next": "Next",
  "action.previous": "Previous",

  // Toasts
  "toast.renamed": "Renamed folder",
  "toast.uploaded": "Added {n} files",
  "toast.uploadedOne": "Added {name}",
  "toast.movedToTrash": "Moved to trash",
  "toast.restored": "Folder restored",
  "toast.permanentlyDeleted": "Permanently deleted",
  "toast.duplicated": "Duplicated",
  "toast.fileMoved": "File moved",
  "toast.linkCopied": "Link copied",

  // Empty states
  "empty.search": "No matches for \"{q}\"",
  "empty.searchDesc": "Try a different search or clear the filter.",
  "empty.folders": "No folders yet",
  "empty.foldersDesc": "Click + New to create one, or use a template.",

  // Onboarding
  "onboarding.skip": "Skip tour",
  "onboarding.next": "Next",
  "onboarding.start": "Get started",

  // Confirms
  "confirm.deleteFolder": "Move to trash?",
  "confirm.deleteFolderDesc":
    "\"{title}\" and {count} items will be moved to the trash.",
}

const ar: Record<keyof typeof en, string> = {
  // App / shell
  "app.title": "المقاطع",
  "app.startTrial": "ابدأ التجربة",
  "library": "المكتبة",
  "settings": "الإعدادات",
  "theme": "السمة",
  "theme.dark": "داكن",
  "theme.light": "فاتح",
  "language": "اللغة",
  "language.en": "English",
  "language.ar": "العربية",
  "accent": "اللون المميز",
  "density": "الكثافة",
  "density.compact": "مدمج",
  "density.cozy": "مريح",
  "density.spacious": "موسع",
  "reduceMotion": "تقليل الحركة",
  "reduceMotion.desc": "تخفيف التأثيرات الحركية",

  // Toolbar
  "toolbar.searchPlaceholder": "ابحث في المجلدات والوسوم والملفات...",
  "toolbar.favorites": "المفضلة",
  "toolbar.filter": "تصفية",
  "toolbar.sort": "ترتيب",
  "toolbar.searchAll": "بحث شامل",
  "toolbar.template": "قالب",
  "toolbar.new": "جديد",
  "toolbar.tags": "الوسوم",
  "toolbar.clear": "مسح",

  // Sidebar
  "sidebar.newFromTemplate": "جديد من قالب",
  "sidebar.search": "بحث",
  "sidebar.duplicates": "المكررات",
  "sidebar.heatmap": "خريطة النشاط",
  "sidebar.libraryRename": "إعادة تسمية",
  "sidebar.export": "تصدير",
  "sidebar.import": "استيراد",
  "sidebar.shortcuts": "اختصارات لوحة المفاتيح",
  "sidebar.smart": "ذكي",
  "sidebar.savedSearches": "عمليات البحث المحفوظة",
  "sidebar.favorites": "المفضلة",
  "sidebar.recent": "الأخيرة",
  "sidebar.allFolders": "جميع المجلدات",
  "sidebar.trash": "سلة المحذوفات",
  "sidebar.reopen": "أعد فتح {name}",

  // Filters
  "filter.all": "كل المجلدات",
  "filter.favorites": "المفضلة فقط",
  "filter.nonEmpty": "تحتوي على عناصر",
  "filter.empty": "فارغة فقط",
  "filter.withImages": "تحتوي صورًا",

  // Sort
  "sort.newestFirst": "الأحدث أولًا",
  "sort.oldestFirst": "الأقدم أولًا",
  "sort.recentlyUpdated": "حدّث مؤخرًا",
  "sort.nameAsc": "الاسم: أ → ي",
  "sort.nameDesc": "الاسم: ي → أ",
  "sort.mostItems": "الأكثر عناصر",

  // Folder dialog
  "folder.itemCount": "{count} عناصر",
  "folder.itemCountOne": "{count} عنصر",
  "folder.created": "أُنشئ في {date}",
  "folder.updated": "حُدّث في {date}",
  "folder.favorite": "إضافة للمفضلة",
  "folder.favorited": "مفضل",
  "folder.pin": "تثبيت",
  "folder.pinned": "مثبت",
  "folder.decorate": "تزيين",
  "folder.duplicate": "تكرار",
  "folder.move": "نقل",
  "folder.share": "مشاركة",
  "folder.shared": "تمت المشاركة",
  "folder.slideshow": "عرض شرائح",
  "folder.aiDescribe": "وصف ذكي",
  "folder.suggestCover": "اقتراح غلاف",
  "folder.lock": "قفل",
  "folder.locked": "مقفل",
  "folder.delete": "حذف",
  "folder.addDescription": "أضف وصفًا...",
  "folder.addTags": "أضف وسومًا...",
  "folder.searchInside": "ابحث داخل هذا المجلد...",
  "folder.subfolder": "مجلد فرعي",
  "folder.subfolders": "المجلدات الفرعية ({count})",
  "folder.files": "الملفات ({count})",
  "folder.noFilesYet": "لا توجد ملفات بعد — ارفع بعضها أعلاه.",
  "folder.noFilesMatch": "لا توجد ملفات تطابق التصفية.",
  "folder.selectAll": "تحديد الكل",
  "folder.deselectAll": "إلغاء التحديد",

  // Tabs
  "tab.files": "الملفات",
  "tab.notes": "الملاحظات",
  "tab.activity": "النشاط",

  // Bulk actions
  "bulk.selected": "{n} محدد",
  "bulk.favorite": "إضافة للمفضلة",
  "bulk.rename": "إعادة تسمية",
  "bulk.edit": "تعديل",
  "bulk.compare": "مقارنة",
  "bulk.move": "نقل",
  "bulk.delete": "حذف",
  "bulk.clear": "مسح",

  // View modes
  "view.grid": "شبكة",
  "view.list": "قائمة",
  "view.calendar": "تقويم",
  "view.map": "خريطة",

  // Trash
  "trash.title": "سلة المحذوفات",
  "trash.subtitle": "يوجد {count} مجلد في السلة. يمكنك استعادتها.",
  "trash.empty": "السلة فارغة.",
  "trash.emptyDesc": "تظهر المجلدات المحذوفة هنا.",
  "trash.emptyButton": "إفراغ السلة",
  "trash.restore": "استعادة",
  "trash.permanent": "نهائي",
  "trash.confirmEmpty": "إفراغ السلة؟",

  // Generic actions
  "action.cancel": "إلغاء",
  "action.save": "حفظ",
  "action.create": "إنشاء",
  "action.apply": "تطبيق",
  "action.close": "إغلاق",
  "action.confirm": "تأكيد",
  "action.next": "التالي",
  "action.previous": "السابق",

  // Toasts
  "toast.renamed": "تمت إعادة تسمية المجلد",
  "toast.uploaded": "تمت إضافة {n} ملف",
  "toast.uploadedOne": "تمت إضافة {name}",
  "toast.movedToTrash": "نُقل إلى السلة",
  "toast.restored": "تمت الاستعادة",
  "toast.permanentlyDeleted": "تم الحذف نهائيًا",
  "toast.duplicated": "تم التكرار",
  "toast.fileMoved": "تم نقل الملف",
  "toast.linkCopied": "تم نسخ الرابط",

  // Empty states
  "empty.search": "لا توجد نتائج لـ \"{q}\"",
  "empty.searchDesc": "جرّب كلمات أخرى أو أزل التصفية.",
  "empty.folders": "لا توجد مجلدات بعد",
  "empty.foldersDesc": "انقر + جديد لإنشاء واحد أو استخدم قالبًا.",

  // Onboarding
  "onboarding.skip": "تخطي",
  "onboarding.next": "التالي",
  "onboarding.start": "ابدأ",

  // Confirms
  "confirm.deleteFolder": "النقل إلى السلة؟",
  "confirm.deleteFolderDesc":
    "سيتم نقل \"{title}\" و{count} عنصرًا إلى السلة.",
}

export type TranslationKey = keyof typeof en

export const dictionaries = {
  en,
  ar,
} as const
