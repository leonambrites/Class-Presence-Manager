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
