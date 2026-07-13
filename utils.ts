export const calculateAge = (birthday?: string, fallbackAge?: number): number | string => {
    if (!birthday) return fallbackAge ?? 'N/A';

    const birthDate = new Date(birthday + 'T00:00:00');
    if (isNaN(birthDate.getTime())) return fallbackAge ?? 'N/A';

    const today = new Date();
    let computedAge = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();

    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        computedAge--;
    }

    return computedAge;
};

export const getClassNameByAge = (age: number): string => {
    if (age < 2) return 'Maternal';
    if (age <= 3) return '2 a 3 anos';
    if (age <= 5) return '4 a 5 anos';
    if (age <= 7) return '6 a 7 anos';
    return '8 a 10 anos';
};

export const getStudentClass = (birthday?: string, fallbackAge?: number): string => {
    const ageVal = calculateAge(birthday, fallbackAge);
    const parsedAge = typeof ageVal === 'number' ? ageVal : Number(fallbackAge || 0);
    return getClassNameByAge(parsedAge);
};

export const resizeImageToBase64 = (file: File, maxWidth = 180, maxHeight = 180): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round((height * maxWidth) / width);
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round((width * maxHeight) / height);
                        height = maxHeight;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0, width, height);
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.85); // 85% quality
                    resolve(dataUrl);
                } else {
                    reject(new Error('Canvas context could not be created'));
                }
            };
            img.onerror = (err) => reject(err);
        };
        reader.onerror = (err) => reject(err);
    });
};

export const isBirthdayThisWeek = (birthdayStr?: string): boolean => {
    if (!birthdayStr) return false;
    const bDate = new Date(birthdayStr + 'T00:00:00');
    if (isNaN(bDate.getTime())) return false;

    const today = new Date();
    const currentDay = today.getDay();
    
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - currentDay);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const bThisYear = new Date(today.getFullYear(), bDate.getMonth(), bDate.getDate());
    const bPrevYear = new Date(today.getFullYear() - 1, bDate.getMonth(), bDate.getDate());
    const bNextYear = new Date(today.getFullYear() + 1, bDate.getMonth(), bDate.getDate());

    return (bThisYear >= startOfWeek && bThisYear <= endOfWeek) ||
           (bPrevYear >= startOfWeek && bPrevYear <= endOfWeek) ||
           (bNextYear >= startOfWeek && bNextYear <= endOfWeek);
};
