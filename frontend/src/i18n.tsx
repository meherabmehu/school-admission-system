import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type Lang = 'en' | 'bn'

const en = {
  appTitle: 'School Admission',
  appSubtitle: 'Apply for a seat online — first come, first served',
  'lang.switch': 'বাংলা',
  'lang.switchLabel': 'Switch language to Bangla',
  'footer.text': 'Seats are given in the order applications arrive. A reserved seat is kept for a limited time until the fee is paid.',

  'student.label': 'Student ID',
  'student.hint': '17-digit birth registration number',
  'student.help': 'Type the student’s 17-digit birth registration number. It is used instead of a password to keep track of applications.',
  'student.placeholder': 'e.g. 20151234567890123',
  'student.digits': '{count} of 17 digits',
  'student.save': 'Continue',
  'student.change': 'Change',
  'student.cancelEdit': 'Keep current',
  'student.current': 'Applying for student',
  'student.invalid': 'The student ID must be exactly 17 digits (numbers only).',
  'student.needed': 'Please enter the student ID at the top of the page first.',
  'student.saved': 'Student ID saved. You can now apply for a class.',

  'nav.label': 'Main sections',
  'nav.classes': 'Classes & seats',
  'nav.my': 'My applications',
  'nav.admin': 'Create a class',
  'nav.adminHint': 'School staff',

  'how.title': 'How admission works',
  'how.step1': 'Pick a class and press “Apply for a seat”.',
  'how.step2': 'A seat is reserved for you for a limited time.',
  'how.step3': 'Pay the fee and press “Confirm admission” before the timer ends.',

  'common.loading': 'Loading…',
  'common.retry': 'Try again',
  'common.refresh': 'Refresh now',
  'common.updatedAt': 'Updated {time}',
  'common.autoUpdate': 'Updates automatically',

  'classes.title': 'Classes open for admission',
  'classes.subtitle': 'Seat numbers update by themselves every few seconds.',
  'classes.loading': 'Loading classes…',
  'classes.emptyTitle': 'No classes yet',
  'classes.empty': 'School staff can add classes from the “Create a class” section.',
  'classes.apply': 'Apply for a seat',
  'classes.applying': 'Applying…',
  'classes.full': 'No seats left',
  'classes.viewApplication': 'View my application',
  'classes.admitted': 'Admitted — view',
  'classes.details': 'Seat details',

  'seats.available': 'Available',
  'seats.held': 'Reserved (waiting for payment)',
  'seats.confirmed': 'Admitted',
  'seats.total': 'Total seats',
  'seats.availableCount': '{count} seats left',
  'seats.oneLeft': 'Only 1 seat left',
  'seats.full': 'Full',
  'seats.aria': '{confirmed} admitted, {held} reserved and {available} available out of {total} seats',

  'apply.success': 'Seat reserved! Please pay the fee and confirm before the timer ends.',
  'apply.existing': 'This student already applied for this class. Here is the application.',

  'detail.back': '← All classes',
  'detail.note': 'Reserved seats are waiting for payment. If the fee is not paid in time, they become available again automatically.',
  'detail.notFoundTitle': 'Class not found',

  'app.back': '← My applications',
  'app.title': 'Application',
  'app.class': 'Class',
  'app.student': 'Student ID',
  'app.reference': 'Application number',
  'app.appliedAt': 'Applied at',
  'app.expiresAt': 'Reserved until',
  'app.confirmedAt': 'Admitted at',
  'app.cancelledAt': 'Cancelled at',
  'app.timeLeft': 'Time left to pay',
  'app.heldTitle': 'Your seat is reserved',
  'app.heldText': 'Pay the admission fee, then press “Confirm admission” before the timer reaches zero. If time runs out, the seat goes to the next applicant.',
  'app.hurry': 'Less than a minute left!',
  'app.confirm': 'I have paid — confirm admission',
  'app.confirming': 'Confirming…',
  'app.cancel': 'Cancel application',
  'app.cancelling': 'Cancelling…',
  'app.cancelAsk': 'Cancel this application? The seat will be released for someone else.',
  'app.cancelYes': 'Yes, cancel it',
  'app.cancelNo': 'No, keep my seat',
  'app.confirmedTitle': 'Admission confirmed',
  'app.confirmedText': 'Congratulations! The seat in this class now belongs to this student.',
  'app.expiredTitle': 'Time is up',
  'app.expiredText': 'The fee was not confirmed in time, so the seat was released. You can apply again if seats are still available.',
  'app.cancelledTitle': 'Application cancelled',
  'app.cancelledText': 'This application was cancelled and the seat was released.',
  'app.applyAgain': 'See the class and apply again',
  'app.confirmOk': 'Admission confirmed!',
  'app.cancelOk': 'Application cancelled. The seat has been released.',
  'app.otherStudent': 'This application belongs to student {id}. Change the student ID at the top to manage it.',
  'app.needStudent': 'Enter the student ID at the top of the page to confirm or cancel this application.',
  'app.notFoundTitle': 'Application not found',

  'step.apply': 'Applied',
  'step.pay': 'Pay the fee',
  'step.done': 'Admitted',

  'status.HELD': 'Waiting for payment',
  'status.CONFIRMED': 'Admitted',
  'status.EXPIRED': 'Expired',
  'status.CANCELLED': 'Cancelled',

  'my.title': 'My applications',
  'my.subtitle': 'Applications for student {id}. This page updates by itself.',
  'my.active': 'In progress',
  'my.past': 'Past applications',
  'my.emptyTitle': 'No applications yet',
  'my.empty': 'Choose a class and apply for a seat to see it here.',
  'my.browse': 'Browse classes',
  'my.needIdTitle': 'Who is applying?',
  'my.needId': 'Enter the student ID at the top of the page to see that student’s applications.',
  'my.enterId': 'Enter student ID',
  'my.pay': 'Pay & confirm',
  'my.view': 'View',
  'my.timeLeft': '{time} left to pay',

  'admin.title': 'Create a new class',
  'admin.subtitle': 'Each class and shift is a separate class with its own number of seats.',
  'admin.name': 'Class name',
  'admin.nameHint': 'Include the shift if there is one, e.g. “Class 6 – Morning Shift”.',
  'admin.namePlaceholder': 'e.g. Class 6 – Morning Shift',
  'admin.seats': 'Number of seats',
  'admin.seatsHint': 'How many students can be admitted (1 to 10,000).',
  'admin.seatsPlaceholder': 'e.g. 40',
  'admin.submit': 'Create class',
  'admin.submitting': 'Creating…',
  'admin.nameRequired': 'Please enter a class name.',
  'admin.nameTooLong': 'The class name can be at most 100 characters.',
  'admin.seatsInvalid': 'Seats must be a whole number from 1 to 10,000.',
  'admin.created': 'Class “{name}” was created with {seats} seats.',
  'admin.createdTitle': 'Class created',
  'admin.viewList': 'See all classes',
  'admin.tipsTitle': 'Good to know',
  'admin.tip1': 'Create one class for every shift, for example a Morning and a Day shift.',
  'admin.tip2': 'Class names must be unique.',
  'admin.tip3': 'Parents see new classes right away on the “Classes & seats” page.',

  'error.NETWORK_ERROR': 'We can’t reach the admission server. Please check your internet connection and try again.',
  'error.NO_SEATS_AVAILABLE': 'Sorry, all seats in this class are taken right now. A seat may open up again if someone does not pay in time.',
  'error.ALREADY_APPLIED': 'This student already has an application for this class.',
  'error.HOLD_EXPIRED': 'The time to pay has run out, so this seat was released.',
  'error.HOLD_CANCELLED': 'This application was cancelled, so it can’t be confirmed.',
  'error.ALREADY_CONFIRMED': 'This admission is already confirmed, so it can’t be cancelled.',
  'error.NOT_YOUR_HOLD': 'This application belongs to a different student ID.',
  'error.HOLD_NOT_FOUND': 'We couldn’t find this application. Please check the link.',
  'error.CLASS_NOT_FOUND': 'We couldn’t find this class. Please go back to the class list.',
  'error.CLASS_ALREADY_EXISTS': 'A class with this name already exists. Please use a different name.',
  'error.INVALID_STUDENT_ID': 'The student ID must be exactly 17 digits (numbers only).',
  'error.STUDENT_ID_REQUIRED': 'Please enter the student ID at the top of the page first.',
  'error.VALIDATION_ERROR': 'Please check the information: {message}',
  'error.INVALID_REQUEST': 'Some information was missing or invalid. Please check and try again.',
  'error.DATABASE_UNAVAILABLE': 'The system is busy or temporarily unavailable. Please try again in a moment.',
  'error.GENERIC': 'Something went wrong. Please try again.',
}

export type TranslationKey = keyof typeof en

const bn: Record<TranslationKey, string> = {
  appTitle: 'স্কুল ভর্তি',
  appSubtitle: 'অনলাইনে সিটের জন্য আবেদন করুন — আগে এলে আগে পাবেন',
  'lang.switch': 'English',
  'lang.switchLabel': 'ভাষা ইংরেজিতে বদলান',
  'footer.text': 'আবেদন যে ক্রমে আসে, সেই ক্রমেই সিট দেওয়া হয়। ফি জমা না দেওয়া পর্যন্ত সিট নির্দিষ্ট সময়ের জন্য সংরক্ষিত থাকে।',

  'student.label': 'শিক্ষার্থীর আইডি',
  'student.hint': '১৭ অঙ্কের জন্ম নিবন্ধন নম্বর',
  'student.help': 'শিক্ষার্থীর ১৭ অঙ্কের জন্ম নিবন্ধন নম্বর লিখুন। পাসওয়ার্ডের বদলে এটা দিয়েই আবেদনগুলো খুঁজে পাওয়া যায়।',
  'student.placeholder': 'যেমন 20151234567890123',
  'student.digits': '১৭টির মধ্যে {count}টি অঙ্ক',
  'student.save': 'এগিয়ে যান',
  'student.change': 'বদলান',
  'student.cancelEdit': 'আগেরটাই রাখুন',
  'student.current': 'যে শিক্ষার্থীর জন্য আবেদন',
  'student.invalid': 'শিক্ষার্থীর আইডি ঠিক ১৭ অঙ্কের হতে হবে (শুধু সংখ্যা)।',
  'student.needed': 'আগে পেজের উপরে শিক্ষার্থীর আইডি লিখুন।',
  'student.saved': 'শিক্ষার্থীর আইডি সেভ হয়েছে। এখন ক্লাসে আবেদন করতে পারবেন।',

  'nav.label': 'প্রধান অংশ',
  'nav.classes': 'ক্লাস ও সিট',
  'nav.my': 'আমার আবেদন',
  'nav.admin': 'ক্লাস তৈরি',
  'nav.adminHint': 'স্কুল কর্তৃপক্ষ',

  'how.title': 'ভর্তি যেভাবে হয়',
  'how.step1': 'একটি ক্লাস বেছে নিয়ে “সিটের জন্য আবেদন” চাপুন।',
  'how.step2': 'নির্দিষ্ট সময়ের জন্য আপনার জন্য একটি সিট সংরক্ষিত থাকবে।',
  'how.step3': 'সময় শেষ হওয়ার আগে ফি জমা দিয়ে “ভর্তি নিশ্চিত করুন” চাপুন।',

  'common.loading': 'লোড হচ্ছে…',
  'common.retry': 'আবার চেষ্টা করুন',
  'common.refresh': 'এখনই হালনাগাদ',
  'common.updatedAt': 'হালনাগাদ {time}',
  'common.autoUpdate': 'নিজে থেকেই হালনাগাদ হয়',

  'classes.title': 'ভর্তি চলছে এমন ক্লাস',
  'classes.subtitle': 'কয়েক সেকেন্ড পরপর সিটের সংখ্যা নিজে থেকেই হালনাগাদ হয়।',
  'classes.loading': 'ক্লাস লোড হচ্ছে…',
  'classes.emptyTitle': 'এখনো কোনো ক্লাস নেই',
  'classes.empty': 'স্কুল কর্তৃপক্ষ “ক্লাস তৈরি” অংশ থেকে ক্লাস যোগ করতে পারবেন।',
  'classes.apply': 'সিটের জন্য আবেদন',
  'classes.applying': 'আবেদন হচ্ছে…',
  'classes.full': 'কোনো সিট খালি নেই',
  'classes.viewApplication': 'আমার আবেদন দেখুন',
  'classes.admitted': 'ভর্তি সম্পন্ন — দেখুন',
  'classes.details': 'সিটের বিস্তারিত',

  'seats.available': 'খালি',
  'seats.held': 'সংরক্ষিত (ফি বাকি)',
  'seats.confirmed': 'ভর্তি সম্পন্ন',
  'seats.total': 'মোট সিট',
  'seats.availableCount': '{count}টি সিট খালি',
  'seats.oneLeft': 'মাত্র ১টি সিট খালি',
  'seats.full': 'পূর্ণ',
  'seats.aria': 'মোট {total}টি সিটের মধ্যে {confirmed}টিতে ভর্তি, {held}টি সংরক্ষিত এবং {available}টি খালি',

  'apply.success': 'সিট সংরক্ষিত হয়েছে! সময় শেষ হওয়ার আগে ফি জমা দিয়ে নিশ্চিত করুন।',
  'apply.existing': 'এই শিক্ষার্থী আগেই এই ক্লাসে আবেদন করেছে। আবেদনটি দেখানো হলো।',

  'detail.back': '← সব ক্লাস',
  'detail.note': 'সংরক্ষিত সিটগুলোর ফি এখনো বাকি। সময়মতো ফি না দিলে সেগুলো নিজে থেকেই আবার খালি হয়ে যায়।',
  'detail.notFoundTitle': 'ক্লাস পাওয়া যায়নি',

  'app.back': '← আমার আবেদন',
  'app.title': 'আবেদন',
  'app.class': 'ক্লাস',
  'app.student': 'শিক্ষার্থীর আইডি',
  'app.reference': 'আবেদন নম্বর',
  'app.appliedAt': 'আবেদনের সময়',
  'app.expiresAt': 'সংরক্ষিত থাকবে',
  'app.confirmedAt': 'ভর্তির সময়',
  'app.cancelledAt': 'বাতিলের সময়',
  'app.timeLeft': 'ফি দেওয়ার বাকি সময়',
  'app.heldTitle': 'আপনার সিট সংরক্ষিত আছে',
  'app.heldText': 'ভর্তি ফি জমা দিন, তারপর টাইমার শূন্য হওয়ার আগে “ভর্তি নিশ্চিত করুন” চাপুন। সময় শেষ হলে সিটটি পরের আবেদনকারী পাবেন।',
  'app.hurry': 'এক মিনিটেরও কম সময় বাকি!',
  'app.confirm': 'ফি দিয়েছি — ভর্তি নিশ্চিত করুন',
  'app.confirming': 'নিশ্চিত করা হচ্ছে…',
  'app.cancel': 'আবেদন বাতিল করুন',
  'app.cancelling': 'বাতিল হচ্ছে…',
  'app.cancelAsk': 'আবেদনটি বাতিল করবেন? সিটটি অন্য কেউ পেয়ে যাবে।',
  'app.cancelYes': 'হ্যাঁ, বাতিল করুন',
  'app.cancelNo': 'না, সিট রাখুন',
  'app.confirmedTitle': 'ভর্তি নিশ্চিত হয়েছে',
  'app.confirmedText': 'অভিনন্দন! এই ক্লাসের সিটটি এখন এই শিক্ষার্থীর।',
  'app.expiredTitle': 'সময় শেষ',
  'app.expiredText': 'সময়মতো ফি নিশ্চিত না হওয়ায় সিটটি ছেড়ে দেওয়া হয়েছে। সিট খালি থাকলে আবার আবেদন করতে পারবেন।',
  'app.cancelledTitle': 'আবেদন বাতিল হয়েছে',
  'app.cancelledText': 'আবেদনটি বাতিল করা হয়েছে এবং সিটটি ছেড়ে দেওয়া হয়েছে।',
  'app.applyAgain': 'ক্লাসটি দেখে আবার আবেদন করুন',
  'app.confirmOk': 'ভর্তি নিশ্চিত হয়েছে!',
  'app.cancelOk': 'আবেদন বাতিল হয়েছে। সিটটি ছেড়ে দেওয়া হয়েছে।',
  'app.otherStudent': 'এই আবেদনটি {id} আইডির শিক্ষার্থীর। এটি পরিচালনা করতে উপরে শিক্ষার্থীর আইডি বদলান।',
  'app.needStudent': 'আবেদনটি নিশ্চিত বা বাতিল করতে পেজের উপরে শিক্ষার্থীর আইডি লিখুন।',
  'app.notFoundTitle': 'আবেদন পাওয়া যায়নি',

  'step.apply': 'আবেদন',
  'step.pay': 'ফি জমা',
  'step.done': 'ভর্তি',

  'status.HELD': 'ফি বাকি',
  'status.CONFIRMED': 'ভর্তি সম্পন্ন',
  'status.EXPIRED': 'মেয়াদ শেষ',
  'status.CANCELLED': 'বাতিল',

  'my.title': 'আমার আবেদন',
  'my.subtitle': '{id} আইডির শিক্ষার্থীর আবেদনসমূহ। এই পেজ নিজে থেকেই হালনাগাদ হয়।',
  'my.active': 'চলমান',
  'my.past': 'আগের আবেদন',
  'my.emptyTitle': 'এখনো কোনো আবেদন নেই',
  'my.empty': 'একটি ক্লাস বেছে নিয়ে সিটের জন্য আবেদন করলে এখানে দেখাবে।',
  'my.browse': 'ক্লাসগুলো দেখুন',
  'my.needIdTitle': 'কে আবেদন করছে?',
  'my.needId': 'শিক্ষার্থীর আবেদনগুলো দেখতে পেজের উপরে তার আইডি লিখুন।',
  'my.enterId': 'শিক্ষার্থীর আইডি লিখুন',
  'my.pay': 'ফি দিয়ে নিশ্চিত করুন',
  'my.view': 'দেখুন',
  'my.timeLeft': 'ফি দেওয়ার জন্য {time} বাকি',

  'admin.title': 'নতুন ক্লাস তৈরি করুন',
  'admin.subtitle': 'প্রতিটি ক্লাস ও শিফট আলাদা ক্লাস হিসেবে থাকে, প্রত্যেকটির নিজস্ব সিট সংখ্যা থাকে।',
  'admin.name': 'ক্লাসের নাম',
  'admin.nameHint': 'শিফট থাকলে নামের সাথে লিখুন, যেমন “Class 6 – Morning Shift”।',
  'admin.namePlaceholder': 'যেমন Class 6 – Morning Shift',
  'admin.seats': 'সিটের সংখ্যা',
  'admin.seatsHint': 'কতজন শিক্ষার্থী ভর্তি হতে পারবে (১ থেকে ১০,০০০)।',
  'admin.seatsPlaceholder': 'যেমন 40',
  'admin.submit': 'ক্লাস তৈরি করুন',
  'admin.submitting': 'তৈরি হচ্ছে…',
  'admin.nameRequired': 'ক্লাসের নাম লিখুন।',
  'admin.nameTooLong': 'ক্লাসের নাম সর্বোচ্চ ১০০ অক্ষরের হতে পারে।',
  'admin.seatsInvalid': 'সিটের সংখ্যা ১ থেকে ১০,০০০-এর মধ্যে একটি পূর্ণ সংখ্যা হতে হবে।',
  'admin.created': '“{name}” ক্লাসটি {seats}টি সিটসহ তৈরি হয়েছে।',
  'admin.createdTitle': 'ক্লাস তৈরি হয়েছে',
  'admin.viewList': 'সব ক্লাস দেখুন',
  'admin.tipsTitle': 'জেনে রাখুন',
  'admin.tip1': 'প্রতিটি শিফটের জন্য আলাদা ক্লাস তৈরি করুন, যেমন Morning ও Day শিফট।',
  'admin.tip2': 'একই নামে দুটি ক্লাস রাখা যাবে না।',
  'admin.tip3': 'নতুন ক্লাস সঙ্গে সঙ্গেই অভিভাবকেরা “ক্লাস ও সিট” পেজে দেখতে পাবেন।',

  'error.NETWORK_ERROR': 'ভর্তি সার্ভারের সাথে যোগাযোগ করা যাচ্ছে না। ইন্টারনেট সংযোগ দেখে আবার চেষ্টা করুন।',
  'error.NO_SEATS_AVAILABLE': 'দুঃখিত, এই মুহূর্তে এই ক্লাসের সব সিট পূর্ণ। কেউ সময়মতো ফি না দিলে আবার সিট খালি হতে পারে।',
  'error.ALREADY_APPLIED': 'এই শিক্ষার্থীর এই ক্লাসে আগেই একটি আবেদন আছে।',
  'error.HOLD_EXPIRED': 'ফি দেওয়ার সময় শেষ হয়ে গেছে, তাই সিটটি ছেড়ে দেওয়া হয়েছে।',
  'error.HOLD_CANCELLED': 'আবেদনটি বাতিল করা হয়েছে, তাই এটি নিশ্চিত করা যাবে না।',
  'error.ALREADY_CONFIRMED': 'এই ভর্তি আগেই নিশ্চিত হয়েছে, তাই বাতিল করা যাবে না।',
  'error.NOT_YOUR_HOLD': 'এই আবেদনটি অন্য একজন শিক্ষার্থীর আইডির।',
  'error.HOLD_NOT_FOUND': 'আবেদনটি খুঁজে পাওয়া যায়নি। লিংকটি ঠিক আছে কি না দেখুন।',
  'error.CLASS_NOT_FOUND': 'ক্লাসটি খুঁজে পাওয়া যায়নি। ক্লাসের তালিকায় ফিরে যান।',
  'error.CLASS_ALREADY_EXISTS': 'এই নামে একটি ক্লাস আগেই আছে। অন্য নাম দিন।',
  'error.INVALID_STUDENT_ID': 'শিক্ষার্থীর আইডি ঠিক ১৭ অঙ্কের হতে হবে (শুধু সংখ্যা)।',
  'error.STUDENT_ID_REQUIRED': 'আগে পেজের উপরে শিক্ষার্থীর আইডি লিখুন।',
  'error.VALIDATION_ERROR': 'তথ্যগুলো আবার দেখুন: {message}',
  'error.INVALID_REQUEST': 'কিছু তথ্য বাদ পড়েছে বা ঠিক নেই। দেখে আবার চেষ্টা করুন।',
  'error.DATABASE_UNAVAILABLE': 'সিস্টেম এখন ব্যস্ত বা সাময়িকভাবে বন্ধ। একটু পরে আবার চেষ্টা করুন।',
  'error.GENERIC': 'কিছু একটা সমস্যা হয়েছে। আবার চেষ্টা করুন।',
}

const dictionaries: Record<Lang, Record<TranslationKey, string>> = { en, bn }
const LANG_KEY = 'admission.lang'

export type Translate = (key: TranslationKey, vars?: Record<string, string | number>) => string

export function isTranslationKey(key: string): key is TranslationKey {
  return key in en
}

export function translate(lang: Lang, key: TranslationKey, vars?: Record<string, string | number>): string {
  let text = dictionaries[lang][key] ?? en[key]
  for (const [name, value] of Object.entries(vars ?? {})) text = text.split(`{${name}}`).join(String(value))
  return text
}

interface I18nValue {
  lang: Lang
  setLang: (lang: Lang) => void
  t: Translate
}

const I18nContext = createContext<I18nValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => (localStorage.getItem(LANG_KEY) === 'bn' ? 'bn' : 'en'))

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const setLang = useCallback((next: Lang) => {
    localStorage.setItem(LANG_KEY, next)
    setLangState(next)
  }, [])

  const value = useMemo<I18nValue>(
    () => ({ lang, setLang, t: (key, vars) => translate(lang, key, vars) }),
    [lang, setLang],
  )
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext)
  if (!value) throw new Error('useI18n must be used inside I18nProvider')
  return value
}
