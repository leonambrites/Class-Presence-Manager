import React, { useState } from 'react';
import StudentForm from './StudentForm';

const PublicRegister: React.FC = () => {
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [parentInitialData, setParentInitialData] = useState<any>(null);

    const handleSubmit = async (formData: any) => {
        setSubmitting(true);
        setError(null);
        try {
            const res = await fetch('/api/public/students', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...formData,
                    type: 'Visitante' // Defaults self-registered child to visitor
                }),
            });

            const resData = await res.json();

            if (!res.ok) {
                throw new Error(resData.error || 'Erro ao realizar o cadastro.');
            }

            // Save parent data and familyId for subsequent registrations
            setParentInitialData({
                guardianName: formData.guardianName || '',
                phone: formData.phone || '',
                motherName: formData.motherName || '',
                fatherName: formData.fatherName || '',
                hasOtherGuardian: formData.hasOtherGuardian || false,
                otherGuardianName: formData.otherGuardianName || '',
                otherGuardianRelationship: formData.otherGuardianRelationship || '',
                imageUseAllowed: formData.imageUseAllowed || false,
                imageUseDocument: formData.imageUseDocument || '',
                familyId: resData.familyId || formData.familyId
            });

            setSuccess(true);
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Erro de conexão. Verifique sua internet e tente novamente.');
        } finally {
            setSubmitting(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-brand-light flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center space-y-6 border border-gray-100 animate-fadeIn">
                    <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto text-green-500 text-3xl shadow-inner animate-bounce">
                        ✓
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900">Cadastro Realizado!</h2>
                        <p className="text-gray-500 mt-2 text-sm">
                            As informações do seu filho(a) foram salvas com sucesso. Agora ele(a) já pode ter a presença confirmada na chegada!
                        </p>
                    </div>
                    <button
                        onClick={() => setSuccess(false)}
                        className="w-full py-3 px-4 bg-brand-blue text-white rounded-xl font-semibold hover:bg-blue-600 transition shadow-md shadow-blue-100"
                    >
                        Cadastrar outra criança
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-brand-light py-10 px-4">
            <div className="max-w-2xl mx-auto space-y-6">
                {/* Header */}
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-extrabold text-brand-dark tracking-tight font-sans">Ficha de Cadastro</h1>
                    <p className="text-sm text-gray-500">
                        Preencha o formulário abaixo para registrar os dados de seu filho(a) no Ministério Infantil.
                    </p>
                </div>

                {error && (
                    <div className="p-4 bg-red-50 text-red-700 rounded-xl border border-red-200 text-sm font-semibold flex items-center gap-2">
                        <span>⚠</span>
                        <span>{error}</span>
                    </div>
                )}

                {/* Form Container */}
                <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 relative overflow-hidden">
                    {submitting && (
                        <div className="absolute inset-0 bg-white/70 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-3">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-brand-blue"></div>
                            <span className="text-sm font-bold text-brand-blue animate-pulse">Enviando dados...</span>
                        </div>
                    )}
                    <StudentForm
                        onSubmit={handleSubmit}
                        initialData={parentInitialData}
                        onCancel={() => {
                            if (window.confirm("Deseja mesmo limpar as informações do formulário?")) {
                                window.location.reload();
                            }
                        }}
                    />
                </div>
            </div>
        </div>
    );
};

export default PublicRegister;
