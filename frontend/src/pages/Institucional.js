import React from 'react';
import { Link } from 'react-router-dom';
import { Wrench, Phone, MapPin, Clock, ChevronRight, Settings, Cog, Disc, Flame, MessageCircle } from 'lucide-react';

const Institucional = () => {
  const whatsappNumber = '5575982982509';
  const whatsappMessage = encodeURIComponent('Olá! Gostaria de solicitar um orçamento.');

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section com Vídeo */}
      <section className="relative h-screen">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src="https://customer-assets.emergentagent.com/job_carmgmt-8/artifacts/dx14vcsr_WhatsApp%20Video%202026-02-11%20at%2016.13.39.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-b from-[#1e3a5f]/80 via-[#1e3a5f]/60 to-[#1e3a5f]/90"></div>
        
        <div className="relative z-10 h-full flex flex-col">
          {/* Header */}
          <header className="p-6">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-[#f97316] rounded-lg flex items-center justify-center">
                  <Wrench className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h1 className="font-heading font-black text-2xl text-white">Oficina Reis</h1>
                  <p className="text-slate-300 text-xs">Retificação de Motores</p>
                </div>
              </div>
              <div className="flex gap-4">
                <Link 
                  to="/consulta-os"
                  className="px-4 py-2 border border-white/30 text-white rounded-md hover:bg-white/10 transition-colors text-sm"
                >
                  Consultar OS
                </Link>
                <Link 
                  to="/login"
                  className="px-4 py-2 bg-[#f97316] text-white rounded-md hover:bg-[#ea580c] transition-colors text-sm font-medium"
                >
                  Área do Cliente
                </Link>
              </div>
            </div>
          </header>

          {/* Hero Content */}
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center px-4 max-w-4xl">
              <h2 className="font-heading font-black text-5xl md:text-7xl text-white mb-6 leading-tight">
                Precisão em cada detalhe,<br />
                <span className="text-[#f97316]">confiança em cada motor.</span>
              </h2>
              <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
                Desde 1997 oferecendo excelência em retificação de motores e usinagem de precisão no Recôncavo Baiano.
              </p>
              <a
                href={`https://wa.me/${whatsappNumber}?text=${whatsappMessage}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-4 px-8 rounded-lg text-lg transition-all transform hover:scale-105 shadow-lg"
              >
                <MessageCircle className="w-6 h-6" />
                Solicitar Orçamento via WhatsApp
              </a>
            </div>
          </div>

          {/* Scroll Indicator */}
          <div className="pb-8 text-center">
            <div className="animate-bounce">
              <ChevronRight className="w-8 h-8 text-white/60 rotate-90 mx-auto" />
            </div>
          </div>
        </div>
      </section>

      {/* Sobre Nós */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="inline-block px-4 py-1 bg-[#f97316]/10 text-[#f97316] rounded-full text-sm font-medium mb-4">
                Nossa História
              </span>
              <h2 className="font-heading font-black text-4xl text-[#1e3a5f] mb-6">
                Tradição e Precisão: A História da Oficina Reis
              </h2>
              <div className="space-y-4 text-slate-600 leading-relaxed">
                <p>
                  Fundada em <strong>06 de maio de 1997</strong> em Santo Antônio de Jesus, a Oficina Reis nasceu do sonho e da expertise técnica de <strong>Eliezer Reis dos Santos</strong>. Com quase três décadas de atuação ininterrupta, nossa trajetória é marcada pela evolução constante e pelo compromisso com a engenharia automotiva e industrial.
                </p>
                <p>
                  Desde 2002 operando sob o nome empresarial <strong>Eliezer Reis dos Santos & Cia Ltda</strong>, consolidamos nossa marca como sinônimo de confiança no Recôncavo Baiano. Localizada estrategicamente na Av. Vereador João Silva, nossa sede é equipada com maquinário de ponta para oferecer o que há de mais moderno em retífica e usinagem.
                </p>
                <p>
                  Mais do que uma oficina, somos um centro de soluções técnicas. Nossa história é construída sobre a base da <strong>honestidade</strong> e da entrega de resultados que garantem a durabilidade e a segurança que seu veículo ou maquinário exigem.
                </p>
              </div>
            </div>
            <div className="relative">
              <img 
                src="https://customer-assets.emergentagent.com/job_carmgmt-8/artifacts/5lc6f79a_ChatGPT%20Image%2011%20de%20fev.%20de%202026%2C%2017_03_25.png" 
                alt="Oficina Reis" 
                className="rounded-lg shadow-xl w-full"
              />
              <div className="absolute -bottom-6 -right-6 bg-[#f97316] text-white p-6 rounded-lg shadow-lg">
                <div className="font-heading font-black text-4xl">+27</div>
                <div className="text-sm">anos de experiência</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Serviços */}
      <section className="py-20 bg-[#1e3a5f]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1 bg-white/10 text-[#f97316] rounded-full text-sm font-medium mb-4">
              Nossos Serviços
            </span>
            <h2 className="font-heading font-black text-4xl text-white mb-4">
              Serviços Especializados
            </h2>
            <p className="text-slate-300 max-w-2xl mx-auto">
              Oferecemos soluções completas em retificação e usinagem com equipamentos de última geração.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {/* Retífica de Motores */}
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 hover:bg-white/20 transition-colors group">
              <div className="w-14 h-14 bg-[#f97316] rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Settings className="w-7 h-7 text-white" />
              </div>
              <h3 className="font-heading font-bold text-xl text-white mb-3">Retífica de Motores</h3>
              <p className="text-slate-300 text-sm">
                Cabeçotes, cilindros e blocos com acabamento de fábrica. Precisão milimétrica para máxima performance.
              </p>
            </div>

            {/* Tornearia e Usinagem */}
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 hover:bg-white/20 transition-colors group">
              <div className="w-14 h-14 bg-[#f97316] rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Cog className="w-7 h-7 text-white" />
              </div>
              <h3 className="font-heading font-bold text-xl text-white mb-3">Tornearia e Usinagem</h3>
              <p className="text-slate-300 text-sm">
                Fabricação e recuperação de peças sob medida com precisão técnica e qualidade garantida.
              </p>
            </div>

            {/* Serviços de Jantes */}
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 hover:bg-white/20 transition-colors group">
              <div className="w-14 h-14 bg-[#f97316] rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Disc className="w-7 h-7 text-white" />
              </div>
              <h3 className="font-heading font-bold text-xl text-white mb-3">Serviços de Jantes</h3>
              <p className="text-slate-300 text-sm">
                Alinhamento e restauração técnica de jantes e aros com equipamentos especializados.
              </p>
            </div>

            {/* Soldas em Geral */}
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 hover:bg-white/20 transition-colors group">
              <div className="w-14 h-14 bg-[#f97316] rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Flame className="w-7 h-7 text-white" />
              </div>
              <h3 className="font-heading font-bold text-xl text-white mb-3">Soldas em Geral</h3>
              <p className="text-slate-300 text-sm">
                Especializada em diversos metais com alta resistência. Soldas TIG, MIG e eletrodo.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Galeria de Trabalhos */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1 bg-[#f97316]/10 text-[#f97316] rounded-full text-sm font-medium mb-4">
              Nosso Trabalho
            </span>
            <h2 className="font-heading font-black text-4xl text-[#1e3a5f] mb-4">
              Qualidade que se Vê
            </h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Cada trabalho entregue com capricho, limpeza e garantia de qualidade.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="rounded-lg overflow-hidden shadow-lg">
              <video
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-64 object-cover"
              >
                <source src="https://customer-assets.emergentagent.com/job_carmgmt-8/artifacts/g84ipmn2_WhatsApp%20Video%202026-02-11%20at%2016.13.40.mp4" type="video/mp4" />
              </video>
              <div className="p-4 bg-slate-50">
                <h3 className="font-bold text-[#1e3a5f]">Processo de Retífica</h3>
                <p className="text-sm text-slate-600">Precisão em cada etapa do processo</p>
              </div>
            </div>
            <div className="rounded-lg overflow-hidden shadow-lg">
              <img 
                src="https://customer-assets.emergentagent.com/job_carmgmt-8/artifacts/eb0byld2_images.jpeg" 
                alt="Trabalho finalizado" 
                className="w-full h-64 object-cover"
              />
              <div className="p-4 bg-slate-50">
                <h3 className="font-bold text-[#1e3a5f]">Trabalho Finalizado</h3>
                <p className="text-sm text-slate-600">Entrega com embalagem e proteção</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Diferenciais */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-8 bg-white rounded-lg shadow-sm">
              <div className="w-16 h-16 bg-[#1e3a5f] rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-heading font-bold text-xl text-[#1e3a5f] mb-2">Desde 1997</h3>
              <p className="text-slate-600 text-sm">Mais de 27 anos de tradição e experiência no mercado.</p>
            </div>
            <div className="text-center p-8 bg-white rounded-lg shadow-sm">
              <div className="w-16 h-16 bg-[#1e3a5f] rounded-full flex items-center justify-center mx-auto mb-4">
                <Settings className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-heading font-bold text-xl text-[#1e3a5f] mb-2">Maquinário Próprio</h3>
              <p className="text-slate-600 text-sm">Equipamentos industriais de última geração para serviços de precisão.</p>
            </div>
            <div className="text-center p-8 bg-white rounded-lg shadow-sm">
              <div className="w-16 h-16 bg-[#1e3a5f] rounded-full flex items-center justify-center mx-auto mb-4">
                <Wrench className="w-8 h-8 text-white" />
              </div>
              <h3 className="font-heading font-bold text-xl text-[#1e3a5f] mb-2">Equipe Especializada</h3>
              <p className="text-slate-600 text-sm">Profissionais qualificados com anos de experiência técnica.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-[#f97316]">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="font-heading font-black text-4xl text-white mb-4">
            Precisa de um orçamento?
          </h2>
          <p className="text-white/90 text-lg mb-8">
            Entre em contato conosco pelo WhatsApp e receba seu orçamento rapidamente!
          </p>
          <a
            href={`https://wa.me/${whatsappNumber}?text=${whatsappMessage}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-3 bg-white text-[#1e3a5f] font-bold py-4 px-8 rounded-lg text-lg transition-all transform hover:scale-105 shadow-lg"
          >
            <MessageCircle className="w-6 h-6" />
            Falar pelo WhatsApp
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#1e3a5f] text-white py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-[#f97316] rounded-lg flex items-center justify-center">
                  <Wrench className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-lg">Oficina Reis</h3>
                  <p className="text-slate-400 text-xs">Retificação de Motores</p>
                </div>
              </div>
              <p className="text-slate-400 text-sm">
                Eliezer Reis dos Santos & Cia Ltda<br />
                CNPJ: XX.XXX.XXX/0001-XX
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-[#f97316]" />
                Localização
              </h4>
              <p className="text-slate-400 text-sm">
                Av. Vereador João Silva, 123<br />
                Andaia - Em frente à Brahma<br />
                Santo Antônio de Jesus - BA
              </p>
            </div>
            <div>
              <h4 className="font-bold mb-4 flex items-center gap-2">
                <Phone className="w-5 h-5 text-[#f97316]" />
                Contato
              </h4>
              <p className="text-slate-400 text-sm">
                <a href="tel:+557536315946" className="hover:text-white transition-colors">(75) 3631-5946</a><br />
                <a href="tel:+5575982982509" className="hover:text-white transition-colors">(75) 98298-2509</a>
              </p>
            </div>
          </div>
          <div className="border-t border-white/10 mt-8 pt-8 text-center text-slate-400 text-sm">
            <p>&copy; {new Date().getFullYear()} Oficina Reis. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Institucional;
