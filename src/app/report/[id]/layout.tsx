import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Sphere | Data Report',
    description: 'Visualización de datos generada con Sphere.',
};

export default function ReportLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
