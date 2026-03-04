import dynamic from 'next/dynamic';

const CalculatorContainer = dynamic(
  () => import('@/components/CalculatorContainer'),
  { ssr: false }
);

export default function Home() {
  return <CalculatorContainer />;
}
