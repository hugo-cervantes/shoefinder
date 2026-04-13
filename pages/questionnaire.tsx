import Navbar from '../components/Navbar';

export default function Questionnaire() {
  return (
    <div>
      <Navbar />

      <section className="h-[80vh] flex flex-col justify-center items-center text-center bg-gray-100">
        <h1 className="text-4xl font-bold mb-4">
          Questionnaire
        </h1>
        <p className="text-gray-600">
          This is where your questionnaire will go.
        </p>
      </section>
    </div>
  );
}
