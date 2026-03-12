import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import macaPeruanaImage from '../macasite.webp';
import { 
  CheckCircle2, 
  Star, 
  ShieldCheck, 
  Truck, 
  ArrowRight, 
  ChevronDown,
  Zap,
  Flame,
  Dumbbell,
  Heart,
  Clock,
  Award,
  Timer,
  Users,
  Check,
  Menu,
  X,
  CreditCard,
  MapPin,
  User,
  Phone,
  Mail,
  Copy,
  QrCode,
  ArrowLeft
} from 'lucide-react';

// --- Types ---

interface Offer {
  id: number;
  name: string;
  price: string;
  installments: string;
  image: string;
  popular: boolean;
  btnClass: string;
}

interface CheckoutData {
  name: string;
  email: string;
  phone: string;
  cpf: string;
  cep: string;
  address: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
}

interface PixChargeResult {
  orderId: string;
  pixCode: string;
  qrCodeUrl: string;
}

interface OrderBump {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
}

const UTM_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
] as const;

type UtmKey = (typeof UTM_KEYS)[number];
type UtmPayload = Record<UtmKey, string>;

const ORDER_BUMPS: OrderBump[] = [
  {
    id: 'bump-testo-extra',
    name: 'Reforço Masculino',
    description: 'Leve +1 frasco de Testo Hard com desconto especial e potencialize seus resultados.',
    price: 19.9,
    image: 'https://i.ibb.co/9k4TtCDz/image.png',
  },
  {
    id: 'bump-maca-peruana',
    name: 'Maca Peruana Premium',
    description: 'Combine com seu Testo Hard e tenha mais energia, resistência e disposição no dia a dia.',
    price: 29.9,
    image: macaPeruanaImage,
  },
];

// --- Components ---

const CheckoutHeader = () => (
  <header className="bg-white border-b border-slate-200 py-3 md:py-4 mb-6 md:mb-8 sticky top-0 z-50">
    <div className="max-w-4xl mx-auto px-5 flex justify-between items-center">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 md:w-8 md:h-8 bg-rose-600 rounded-lg flex items-center justify-center text-white font-black text-base md:text-lg">B</div>
        <span className="font-display text-sm md:text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap">BIONUTRI <span className="text-rose-600">TESTO HARD</span></span>
      </div>
      <div className="flex items-center gap-1.5 md:gap-2 text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest whitespace-nowrap">
        <ShieldCheck size={12} className="text-green-500 md:w-[14px] md:h-[14px]" /> <span className="hidden xs:inline">Checkout</span> Seguro
      </div>
    </div>
  </header>
);

const PixIcon = ({ className = '' }: { className?: string }) => (
  <svg viewBox="0 0 16 16" className={className} aria-hidden="true" fill="currentColor">
    <path d="M11.917 11.71a2.046 2.046 0 0 1-1.454-.602l-2.1-2.1a.4.4 0 0 0-.551 0l-2.108 2.108a2.044 2.044 0 0 1-1.454.602h-.414l2.66 2.66c.83.83 2.177.83 3.007 0l2.667-2.668h-.253zM4.25 4.282c.55 0 1.066.214 1.454.602l2.108 2.108a.39.39 0 0 0 .552 0l2.1-2.1a2.044 2.044 0 0 1 1.453-.602h.253L9.503 1.623a2.127 2.127 0 0 0-3.007 0l-2.66 2.66h.414z" />
    <path d="m14.377 6.496-1.612-1.612a.307.307 0 0 1-.114.023h-.733c-.379 0-.75.154-1.017.422l-2.1 2.1a1.005 1.005 0 0 1-1.425 0L5.268 5.32a1.448 1.448 0 0 0-1.018-.422h-.9a.306.306 0 0 1-.109-.021L1.623 6.496c-.83.83-.83 2.177 0 3.008l1.618 1.618a.305.305 0 0 1 .108-.022h.901c.38 0 .75-.153 1.018-.421L7.375 8.57a1.034 1.034 0 0 1 1.426 0l2.1 2.1c.267.268.638.421 1.017.421h.733c.04 0 .079.01.114.024l1.612-1.612c.83-.83.83-2.178 0-3.008z" />
  </svg>
);

type OptimizedImageProps = React.ImgHTMLAttributes<HTMLImageElement> & {
  priority?: boolean;
};

const OptimizedImage = ({ priority = false, loading, decoding, ...props }: OptimizedImageProps) => (
  <img
    {...props}
    loading={priority ? 'eager' : (loading ?? 'lazy')}
    decoding={decoding ?? 'async'}
    fetchPriority={priority ? 'high' : 'auto'}
  />
);

const Checkout = ({ offer, onBack }: { offer: Offer; onBack: () => void }) => {
  const [step, setStep] = useState<'form' | 'payment'>('form');
  const [shippingMethod, setShippingMethod] = useState<'free' | 'sedex'>('free');
  const [quantity, setQuantity] = useState(1);
  const [formData, setFormData] = useState<CheckoutData>({
    name: '',
    email: '',
    phone: '',
    cpf: '',
    cep: '',
    address: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: '',
  });
  const [isFetchingCep, setIsFetchingCep] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({ cpf: '', cep: '' });
  const [touchedFields, setTouchedFields] = useState({ cpf: false, cep: false });
  const [cepLookupError, setCepLookupError] = useState('');
  const [isCreatingPixCharge, setIsCreatingPixCharge] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [pixCharge, setPixCharge] = useState<PixChargeResult | null>(null);
  const [isPixCopied, setIsPixCopied] = useState(false);
  const [selectedOrderBumps, setSelectedOrderBumps] = useState<string[]>([]);

  const unitPrice = parseFloat(offer.price.replace(',', '.'));
  const subtotal = unitPrice * quantity;
  const shippingCost = shippingMethod === 'sedex' ? 18.39 : 0;
  const orderBumpsTotal = ORDER_BUMPS
    .filter((bump) => selectedOrderBumps.includes(bump.id))
    .reduce((sum, bump) => sum + bump.price, 0);
  const totalPrice = (subtotal + shippingCost + orderBumpsTotal).toFixed(2).replace('.', ',');
  const subtotalPrice = subtotal.toFixed(2).replace('.', ',');
  const orderBumpsPrice = orderBumpsTotal.toFixed(2).replace('.', ',');

  const toggleOrderBump = (id: string) => {
    setSelectedOrderBumps((prev) => (
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    ));
  };

  const getUtmPayload = (): UtmPayload => {
    const searchParams = new URLSearchParams(window.location.search);
    const utm: Partial<UtmPayload> = {};

    UTM_KEYS.forEach((key) => {
      const valueFromUrl = searchParams.get(key)?.trim() ?? '';
      const storageKey = `utmify:${key}`;
      const valueFromStorage = sessionStorage.getItem(storageKey)?.trim() ?? '';
      const finalValue = valueFromUrl || valueFromStorage || '';

      if (valueFromUrl) {
        sessionStorage.setItem(storageKey, valueFromUrl);
      }

      utm[key] = finalValue;
    });

    return utm as UtmPayload;
  };

  const normalizePhone = (phoneValue: string) => {
    const digits = phoneValue.replace(/\D/g, '');
    return digits.startsWith('55') ? digits : `55${digits}`;
  };

  const getPixPayloadFromResponse = (payload: any): PixChargeResult | null => {
    if (!payload?.data) return null;
    const data = payload.data;
    const pixData = data.pix ?? {};

    const pickString = (...values: unknown[]) => {
      const firstValid = values.find((value) => typeof value === 'string' && value.trim().length > 0);
      return typeof firstValid === 'string' ? firstValid : '';
    };

    const pixCode = pickString(
      pixData.copy_paste,
      pixData.copyPaste,
      pixData.emv,
      pixData.payload,
      pixData.code,
      data.copy_paste,
      data.copyPaste,
      data.emv,
      data.payload,
      data.code
    );

    let qrCodeUrl = pickString(
      pixData.qr_code,
      pixData.qrCode,
      pixData.qrcode,
      data.qr_code,
      data.qrCode,
      data.qrcode
    );

    if (qrCodeUrl && !qrCodeUrl.startsWith('http') && !qrCodeUrl.startsWith('data:image')) {
      qrCodeUrl = `data:image/png;base64,${qrCodeUrl}`;
    }

    if (!qrCodeUrl && pixCode) {
      qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(pixCode)}`;
    }

    if (!pixCode || !qrCodeUrl) return null;

    return {
      orderId: data.order_id ?? data.orderId ?? '',
      pixCode,
      qrCodeUrl,
    };
  };

  const createPixCharge = async () => {
    setIsCreatingPixCharge(true);
    setPaymentError('');

    try {
      const utm = getUtmPayload();

      const response = await fetch('/api/pix/charge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: normalizePhone(formData.phone),
          cpf: formData.cpf.replace(/\D/g, ''),
          itemValue: Math.round(unitPrice * 100),
          quantity,
          shippingValue: Math.round(shippingCost * 100),
          orderBumpsValue: Math.round(orderBumpsTotal * 100),
          subtotalValue: Math.round(subtotal * 100),
          totalValue: Math.round((subtotal + shippingCost + orderBumpsTotal) * 100),
          utm,
        }),
      });

      const result = await response.json();
      if (!response.ok || !result?.success) {
        throw new Error(result?.message ?? 'Não foi possível criar a cobrança PIX.');
      }

      const pixData = getPixPayloadFromResponse(result);
      if (!pixData) {
        throw new Error('Cobrança criada, mas os dados PIX não foram retornados pela API.');
      }

      setPixCharge(pixData);
      return true;
    } catch (error) {
      setPaymentError(error instanceof Error ? error.message : 'Erro ao criar pagamento PIX.');
      return false;
    } finally {
      setIsCreatingPixCharge(false);
    }
  };

  const validateCpf = (cpfValue: string) => {
    const cpf = cpfValue.replace(/\D/g, '');
    if (cpf.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(cpf)) return false;

    let sum = 0;
    for (let i = 0; i < 9; i += 1) sum += Number(cpf[i]) * (10 - i);
    let firstCheckDigit = (sum * 10) % 11;
    if (firstCheckDigit === 10) firstCheckDigit = 0;
    if (firstCheckDigit !== Number(cpf[9])) return false;

    sum = 0;
    for (let i = 0; i < 10; i += 1) sum += Number(cpf[i]) * (11 - i);
    let secondCheckDigit = (sum * 10) % 11;
    if (secondCheckDigit === 10) secondCheckDigit = 0;
    return secondCheckDigit === Number(cpf[10]);
  };

  const validateCep = (cepValue: string) => {
    const cep = cepValue.replace(/\D/g, '');
    return cep.length === 8;
  };

  // Fetch address from ViaCEP when CEP is valid
  useEffect(() => {
    getUtmPayload();
  }, []);

  useEffect(() => {
    const cep = formData.cep.replace(/\D/g, '');
    if (cep.length === 8) {
      const fetchAddress = async () => {
        setIsFetchingCep(true);
        try {
          const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
          const data = await response.json();
          if (!data.erro) {
            setCepLookupError('');
            setFieldErrors(prev => ({ ...prev, cep: '' }));
            setFormData(prev => ({
              ...prev,
              address: data.logradouro || prev.address,
              neighborhood: data.bairro || prev.neighborhood,
              city: data.localidade || prev.city,
              state: data.uf || prev.state,
            }));
            // Focus on number field after filling address
            const numberInput = document.getElementsByName('number')[0] as HTMLInputElement;
            if (numberInput) numberInput.focus();
          } else {
            const message = 'CEP inválido. Confira o número.';
            setCepLookupError(message);
            setFieldErrors(prev => ({ ...prev, cep: message }));
          }
        } catch (error) {
          console.error('Erro ao buscar CEP:', error);
          const message = 'CEP inválido. Confira o número.';
          setCepLookupError(message);
          setFieldErrors(prev => ({ ...prev, cep: message }));
        } finally {
          setIsFetchingCep(false);
        }
      };
      fetchAddress();
    } else {
      setCepLookupError('');
      setFieldErrors(prev => ({ ...prev, cep: '' }));
    }
  }, [formData.cep]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    let formattedValue = value;
    if (name === 'cep') {
      formattedValue = value.replace(/\D/g, '').slice(0, 8);
      if (formattedValue.length > 5) {
        formattedValue = `${formattedValue.slice(0, 5)}-${formattedValue.slice(5)}`;
      }
      if (formattedValue.replace(/\D/g, '').length === 8) {
        setTouchedFields(prev => ({ ...prev, cep: true }));
      }
    } else if (name === 'cpf') {
      formattedValue = value.replace(/\D/g, '').slice(0, 11);
      if (formattedValue.length > 9) {
        formattedValue = `${formattedValue.slice(0, 3)}.${formattedValue.slice(3, 6)}.${formattedValue.slice(6, 9)}-${formattedValue.slice(9)}`;
      } else if (formattedValue.length > 6) {
        formattedValue = `${formattedValue.slice(0, 3)}.${formattedValue.slice(3, 6)}.${formattedValue.slice(6)}`;
      } else if (formattedValue.length > 3) {
        formattedValue = `${formattedValue.slice(0, 3)}.${formattedValue.slice(3)}`;
      }
    } else if (name === 'phone') {
      formattedValue = value.replace(/\D/g, '').slice(0, 11);
      if (formattedValue.length > 10) {
        formattedValue = `(${formattedValue.slice(0, 2)}) ${formattedValue.slice(2, 7)}-${formattedValue.slice(7)}`;
      } else if (formattedValue.length > 6) {
        formattedValue = `(${formattedValue.slice(0, 2)}) ${formattedValue.slice(2, 6)}-${formattedValue.slice(6)}`;
      } else if (formattedValue.length > 2) {
        formattedValue = `(${formattedValue.slice(0, 2)}) ${formattedValue.slice(2)}`;
      } else if (formattedValue.length > 0) {
        formattedValue = `(${formattedValue}`;
      }
    }

    setFormData(prev => ({ ...prev, [name]: formattedValue }));

    if (name === 'cpf' && touchedFields.cpf) {
      setFieldErrors(prev => ({
        ...prev,
        cpf: validateCpf(formattedValue) ? '' : 'CPF inválido. Confira os números.',
      }));
    }

    if (name === 'cep' && touchedFields.cep) {
      setCepLookupError('');
      setFieldErrors(prev => ({
        ...prev,
        cep: validateCep(formattedValue) ? '' : 'CEP inválido. Use o formato 00000-000.',
      }));
    }
  };

  const handleFieldBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    if (name === 'cpf') {
      setTouchedFields(prev => ({ ...prev, cpf: true }));
      setFieldErrors(prev => ({
        ...prev,
        cpf: validateCpf(value) ? '' : 'CPF inválido. Confira os números.',
      }));
    }

    if (name === 'cep') {
      setTouchedFields(prev => ({ ...prev, cep: true }));
      setFieldErrors(prev => ({
        ...prev,
        cep: !validateCep(value)
          ? 'CEP inválido. Use o formato 00000-000.'
          : cepLookupError,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cpfError = validateCpf(formData.cpf) ? '' : 'CPF inválido. Confira os números.';
    const cepError = !validateCep(formData.cep)
      ? 'CEP inválido. Use o formato 00000-000.'
      : isFetchingCep
        ? 'Aguarde a validação do CEP.'
        : cepLookupError;

    setTouchedFields({ cpf: true, cep: true });
    setFieldErrors({ cpf: cpfError, cep: cepError });

    if (cpfError || cepError) return;

    const isPixReady = await createPixCharge();
    if (!isPixReady) return;

    setStep('payment');
    window.scrollTo(0, 0);
  };

  const copyPixCode = async () => {
    if (!pixCharge?.pixCode) {
      setPaymentError('Código PIX indisponível.');
      return;
    }
    try {
      await navigator.clipboard.writeText(pixCharge.pixCode);
      setIsPixCopied(true);
      setTimeout(() => setIsPixCopied(false), 2500);
    } catch {
      setPaymentError('Não foi possível copiar o código PIX.');
    }
  };

  if (step === 'payment') {
    return (
      <div className="min-h-screen bg-slate-50 pb-12">
        <CheckoutHeader />
        <div className="max-w-xl mx-auto px-5">
          <button onClick={() => setStep('form')} className="flex items-center gap-2 text-slate-500 mb-8 hover:text-slate-800 transition-colors">
            <ArrowLeft size={20} /> Voltar para os dados
          </button>

          <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-100 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 text-green-600 rounded-full mb-6">
              <QrCode size={32} />
            </div>
            
            <h2 className="text-2xl font-black mb-2 uppercase italic">Pague com PIX</h2>
            <p className="text-slate-500 text-sm mb-4">Escaneie o QR Code ou copie o código abaixo para finalizar sua compra de <span className="font-bold text-slate-800">{offer.name}</span> ({quantity} unidade{quantity > 1 ? 's' : ''}).</p>
            
            <div className="mb-8">
              <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest block mb-1">Valor Total</span>
              <span className="text-3xl font-black text-rose-600 italic">R$ {totalPrice}</span>
            </div>

            <div className="bg-slate-50 p-6 rounded-2xl mb-8 flex flex-col items-center">
              <OptimizedImage
                src={pixCharge?.qrCodeUrl ?? 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=erro-ao-gerar-pix'} 
                alt="QR Code PIX" 
                className="w-48 h-48 mb-4"
                referrerPolicy="no-referrer"
                priority
              />
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Aguardando pagamento...</p>
              {pixCharge?.orderId && (
                <p className="text-[10px] text-slate-400 mt-2">Pedido: {pixCharge.orderId}</p>
              )}
            </div>

            <div className="space-y-4">
              <button 
                onClick={copyPixCode}
                className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors ${
                  isPixCopied
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-900 text-white hover:bg-slate-800'
                }`}
              >
                <Copy size={18} /> {isPixCopied ? 'COPIADO' : 'COPIAR CÓDIGO PIX'}
              </button>
              
              <div className="text-left bg-blue-50 p-4 rounded-xl border border-blue-100">
                <h4 className="text-blue-800 font-bold text-xs uppercase mb-2 flex items-center gap-2">
                  <Zap size={14} /> Como pagar?
                </h4>
                <ol className="text-[11px] text-blue-700 space-y-1 list-decimal ml-4">
                  <li>Abra o app do seu banco</li>
                  <li>Escolha a opção PIX &gt; Copia e Cola ou QR Code</li>
                  <li>Cole o código ou escaneie a imagem</li>
                  <li>Confirme os dados e finalize o pagamento</li>
                </ol>
              </div>
            </div>
            {paymentError && (
              <p className="mt-4 text-xs text-red-600 font-bold">{paymentError}</p>
            )}
            
            <p className="mt-8 text-[10px] text-slate-400 uppercase font-bold">
              O acesso ao rastreio será enviado para o seu e-mail após a confirmação.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      <CheckoutHeader />
      <div className="max-w-4xl mx-auto px-5">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-500 mb-8 hover:text-slate-800 transition-colors">
          <ArrowLeft size={20} /> Voltar para as ofertas
        </button>

        <div className="flex flex-col md:grid md:grid-cols-3 gap-8">
          {/* Order Summary - Top on Mobile, Sidebar on Desktop */}
          <div className="md:col-span-1 md:order-last">
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 md:sticky md:top-24">
              <h3 className="text-sm font-black mb-6 uppercase italic border-b border-slate-100 pb-4">Produto Selecionado</h3>
              <div className="flex items-center gap-4 mb-6">
                <OptimizedImage src={offer.image} alt={offer.name} className="w-16 h-16 object-contain" referrerPolicy="no-referrer" />
                <div>
                  <h4 className="font-bold text-sm">{offer.name}</h4>
                  <p className="text-xs text-slate-500">Fórmula Original Bionutri</p>
                </div>
              </div>
              <div className="mb-6">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block mb-2">Quantidade</span>
                <div className="inline-flex items-center rounded-xl border border-slate-200 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                    className="w-10 h-10 bg-slate-50 text-slate-700 font-black text-lg hover:bg-slate-100 transition-colors"
                    aria-label="Diminuir quantidade"
                  >
                    -
                  </button>
                  <span className="w-12 h-10 flex items-center justify-center text-sm font-black text-slate-900">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity((prev) => prev + 1)}
                    className="w-10 h-10 bg-slate-50 text-slate-700 font-black text-lg hover:bg-slate-100 transition-colors"
                    aria-label="Aumentar quantidade"
                  >
                    +
                  </button>
                </div>
              </div>
              
              <div className="mt-8 space-y-3 hidden md:block">
                <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase">
                  <Truck size={14} className="text-green-500" /> Entrega Garantida
                </div>
              </div>
            </div>
          </div>

          {/* Checkout Form */}
          <div className="md:col-span-2 space-y-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Dados Pessoais */}
              <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
                <h3 className="text-lg font-black mb-6 flex items-center gap-2 uppercase italic">
                  <User size={20} className="text-rose-600" /> Dados Pessoais
                </h3>
                <div className="grid gap-4">
                  <div className="relative">
                    <input
                      id="checkout-name"
                      required
                      name="name"
                      placeholder="Nome completo"
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-rose-600 transition-colors"
                      value={formData.name}
                      onChange={handleInputChange}
                    />
                    <span
                      className={`pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400 transition-opacity ${
                        formData.name.trim().length > 0 ? 'opacity-0' : 'opacity-100'
                      }`}
                    >
                      Nome completo
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      required
                      type="email"
                      name="email"
                      placeholder="Seu melhor e-mail"
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-rose-600 transition-colors"
                      value={formData.email}
                      onChange={handleInputChange}
                    />
                    <input
                      required
                      name="phone"
                      placeholder="WhatsApp com DDD"
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-rose-600 transition-colors"
                      value={formData.phone}
                      onChange={handleInputChange}
                    />
                  </div>
                  <input
                    required
                    name="cpf"
                    placeholder="CPF"
                    className={`w-full p-4 bg-slate-50 border rounded-xl text-sm focus:outline-none transition-colors ${
                      fieldErrors.cpf ? 'border-red-500 focus:border-red-500' : 'border-slate-200 focus:border-rose-600'
                    }`}
                    value={formData.cpf}
                    onChange={handleInputChange}
                    onBlur={handleFieldBlur}
                  />
                  {fieldErrors.cpf && <p className="text-xs text-red-600 -mt-2">{fieldErrors.cpf}</p>}
                </div>
              </div>

              {/* Endereço de Entrega */}
              <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
                <h3 className="text-lg font-black mb-6 flex items-center gap-2 uppercase italic">
                  <MapPin size={20} className="text-rose-600" /> Endereço de Entrega
                </h3>
                <div className="grid gap-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="relative">
                        <input 
                          required
                          name="cep"
                          placeholder="CEP"
                          className={`w-full p-4 bg-slate-50 border rounded-xl text-sm focus:outline-none transition-colors ${isFetchingCep ? 'opacity-50' : ''} ${
                            fieldErrors.cep ? 'border-red-500 focus:border-red-500' : 'border-slate-200 focus:border-rose-600'
                          }`}
                          value={formData.cep}
                          onChange={handleInputChange}
                          onBlur={handleFieldBlur}
                        />
                        {isFetchingCep && (
                          <div className="absolute right-4 top-1/2 -translate-y-1/2">
                            <div className="w-4 h-4 border-2 border-rose-600 border-t-transparent rounded-full animate-spin"></div>
                          </div>
                        )}
                      </div>
                      {fieldErrors.cep && <p className="text-xs text-red-600">{fieldErrors.cep}</p>}
                    </div>
                    <input 
                      required
                      name="city"
                      placeholder="Cidade"
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-rose-600 transition-colors"
                      value={formData.city}
                      onChange={handleInputChange}
                    />
                  </div>
                  <input 
                    required
                    name="address"
                    placeholder="Endereço (Rua, Avenida...)"
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-rose-600 transition-colors"
                    value={formData.address}
                    onChange={handleInputChange}
                  />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input 
                      required
                      name="number"
                      placeholder="Número"
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-rose-600 transition-colors"
                      value={formData.number}
                      onChange={handleInputChange}
                    />
                    <input 
                      name="complement"
                      placeholder="Complemento (Opcional)"
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-rose-600 transition-colors"
                      value={formData.complement}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input 
                      required
                      name="neighborhood"
                      placeholder="Bairro"
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-rose-600 transition-colors"
                      value={formData.neighborhood}
                      onChange={handleInputChange}
                    />
                    <input 
                      required
                      name="state"
                      placeholder="Estado (UF)"
                      className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-rose-600 transition-colors"
                      value={formData.state}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>
              </div>

              {/* Opções de Frete - Aparece após preencher o CEP */}
              {formData.cep.replace(/\D/g, '').length >= 8 && (
                <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 animate-in fade-in slide-in-from-top-4 duration-500">
                  <h3 className="text-lg font-black mb-6 flex items-center gap-2 uppercase italic">
                    <Truck size={20} className="text-rose-600" /> Opções de Entrega
                  </h3>
                  <div className="grid gap-3">
                    <button
                      type="button"
                      onClick={() => setShippingMethod('free')}
                      className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                        shippingMethod === 'free' 
                          ? 'border-rose-600 bg-rose-50 shadow-sm' 
                          : 'border-slate-100 bg-slate-50 hover:border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          shippingMethod === 'free' ? 'border-rose-600' : 'border-slate-300'
                        }`}>
                          {shippingMethod === 'free' && <div className="w-2.5 h-2.5 rounded-full bg-rose-600" />}
                        </div>
                        <div className="text-left">
                          <span className="block font-bold text-slate-800 text-sm">Frete Grátis</span>
                          <span className="block text-[10px] text-slate-500 uppercase font-bold">7 a 12 dias úteis</span>
                        </div>
                      </div>
                      <span className="text-green-600 font-black text-sm uppercase italic">Grátis</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShippingMethod('sedex')}
                      className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                        shippingMethod === 'sedex' 
                          ? 'border-rose-600 bg-rose-50 shadow-sm' 
                          : 'border-slate-100 bg-slate-50 hover:border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          shippingMethod === 'sedex' ? 'border-rose-600' : 'border-slate-300'
                        }`}>
                          {shippingMethod === 'sedex' && <div className="w-2.5 h-2.5 rounded-full bg-rose-600" />}
                        </div>
                        <div className="text-left">
                          <span className="block font-bold text-slate-800 text-sm">Frete SEDEX</span>
                          <span className="block text-[10px] text-slate-500 uppercase font-bold">2 a 5 dias úteis</span>
                        </div>
                      </div>
                      <span className="text-slate-800 font-black text-sm uppercase italic">R$ 18,39</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Pagamento */}
              <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100">
                <h3 className="text-lg font-black mb-6 flex items-center gap-2 uppercase italic">
                  <CreditCard size={20} className="text-rose-600" /> Forma de Pagamento
                </h3>
                <div className="group relative overflow-hidden p-5 border-2 border-rose-600 bg-gradient-to-br from-rose-50 to-white rounded-2xl flex items-center justify-between transition-all hover:shadow-md">
                  <div className="absolute top-0 right-0 p-2 opacity-10">
                    <Zap size={40} className="text-rose-600" />
                  </div>
                  <div className="flex items-center gap-4 relative z-10">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full border-2 border-rose-600 bg-white">
                      <div className="w-2.5 h-2.5 rounded-full bg-rose-600"></div>
                    </div>
                    <div>
                      <span className="block font-black text-slate-800 text-sm md:text-base">PIX (Aprovação Imediata)</span>
                      <span className="block text-[10px] text-rose-600 font-bold uppercase tracking-wider">Liberação instantânea do pedido</span>
                    </div>
                  </div>
                  <div className="relative z-10 inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1">
                    <PixIcon className="h-4 w-4 md:h-5 md:w-5 text-emerald-600" />
                    <span className="text-[10px] md:text-xs font-black uppercase text-emerald-700 tracking-wide">PIX</span>
                  </div>
                </div>
                <div className="mt-4 flex items-start gap-2 p-3 bg-slate-50 rounded-xl">
                  <Zap size={14} className="text-amber-500 mt-0.5 shrink-0" />
                  <p className="text-[10px] text-slate-500 leading-relaxed">
                    <span className="font-bold text-slate-700">DICA:</span> O pagamento via PIX é processado na hora e garante que seu pedido seja enviado ainda hoje.
                  </p>
                </div>
                <div className="mt-5 space-y-3">
                  {ORDER_BUMPS.map((bump) => {
                    const isSelected = selectedOrderBumps.includes(bump.id);
                    return (
                      <button
                        key={bump.id}
                        type="button"
                        onClick={() => toggleOrderBump(bump.id)}
                        className={`w-full text-left rounded-xl border p-4 transition-colors ${
                          isSelected
                            ? 'border-emerald-500 bg-emerald-50'
                            : 'border-slate-200 bg-white hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <OptimizedImage
                              src={bump.image}
                              alt={bump.name}
                              className="w-14 h-14 rounded-lg object-cover border border-slate-200"
                              referrerPolicy="no-referrer"
                            />
                            <div>
                              <p className="font-black text-slate-900">{bump.name}</p>
                              <p className="text-xs text-slate-500 mt-1">{bump.description}</p>
                            </div>
                          </div>
                          <span className="text-emerald-600 font-black whitespace-nowrap">
                            + R$ {bump.price.toFixed(2).replace('.', ',')}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-slate-100">
                <h3 className="text-sm font-black mb-6 uppercase italic border-b border-slate-100 pb-4">Resumo do Pedido</h3>
                <div className="flex items-center gap-4 mb-6">
                  <OptimizedImage src={offer.image} alt={offer.name} className="w-16 h-16 object-contain" referrerPolicy="no-referrer" />
                  <div>
                    <h4 className="font-bold text-sm">{offer.name}</h4>
                    <p className="text-xs text-slate-500">Fórmula Original Bionutri</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Subtotal ({quantity}x)</span>
                    <span className="font-bold">R$ {subtotalPrice}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Frete</span>
                    <span className={`${shippingMethod === 'free' ? 'text-green-600' : 'text-slate-800'} font-bold uppercase`}>
                      {shippingMethod === 'free' ? 'Grátis' : `R$ ${shippingCost.toFixed(2).replace('.', ',')}`}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">Adicionais</span>
                    <span className="font-bold">R$ {orderBumpsPrice}</span>
                  </div>
                  <div className="flex justify-between text-lg font-black pt-4 border-t border-slate-100">
                    <span>TOTAL</span>
                    <span className="text-rose-600 uppercase italic">R$ {totalPrice}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <button
                  type="submit"
                  disabled={isCreatingPixCharge}
                  className="btn-primary w-full py-5 text-lg flex items-center justify-center gap-3 shadow-lg shadow-rose-200 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                  {isCreatingPixCharge ? 'GERANDO PIX...' : 'FINALIZAR COMPRA'} <ArrowRight size={20} />
                </button>
                {paymentError && <p className="text-xs text-red-600 font-bold -mt-2">{paymentError}</p>}

                <div className="bg-white rounded-2xl border border-slate-200 p-4">
                  <div className="flex items-center justify-center gap-1 text-amber-400 mb-3">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star key={star} size={14} fill="currentColor" />
                    ))}
                  </div>
                  <p className="text-center text-sm font-black text-slate-900 mb-3 normal-case">
                    Mais de 1.300 clientes satisfeitos
                  </p>
                  <div className="space-y-2">
                    <blockquote className="bg-slate-50 rounded-xl p-3 text-xs text-slate-600 leading-relaxed">
                      "Depois de 2 semanas senti mais energia no treino e no dia a dia."
                      <span className="font-bold text-slate-800"> - Carlos M., Belo Horizonte/MG</span>
                    </blockquote>
                    <blockquote className="bg-slate-50 rounded-xl p-3 text-xs text-slate-600 leading-relaxed">
                      "Muito bom o custo-benefício. Disposição melhorou e o foco também."
                      <span className="font-bold text-slate-800"> - Rafael S., Campinas/SP</span>
                    </blockquote>
                    <blockquote className="bg-slate-50 rounded-xl p-3 text-xs text-slate-600 leading-relaxed">
                      "Produto chegou rápido e já percebi diferença na rotina de treinos."
                      <span className="font-bold text-slate-800"> - Diego P., Curitiba/PR</span>
                    </blockquote>
                  </div>
                </div>
                
                {/* Trust Footer below button */}
                <div className="grid grid-cols-3 gap-4 py-6 border-t border-slate-100">
                  <div className="text-center">
                    <div className="flex justify-center mb-2">
                      <ShieldCheck size={20} className="text-slate-400" />
                    </div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase leading-tight">Compra 100% Protegida</p>
                  </div>
                  <div className="text-center border-x border-slate-100">
                    <div className="flex justify-center mb-2">
                      <Truck size={20} className="text-slate-400" />
                    </div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase leading-tight">Frete Grátis com Seguro</p>
                  </div>
                  <div className="text-center">
                    <div className="flex justify-center mb-2">
                      <Zap size={20} className="text-slate-400" />
                    </div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase leading-tight">Aprovação Imediata</p>
                  </div>
                </div>

                <div className="bg-slate-100/50 rounded-2xl p-4 flex items-center gap-4">
                  <OptimizedImage src="https://i.ibb.co/9k4TtCDz/image.png" className="w-10 h-10 object-contain opacity-50 grayscale" alt="Garantia" referrerPolicy="no-referrer" />
                  <p className="text-[10px] text-slate-500 leading-tight">
                    <span className="font-bold text-slate-700 block mb-1">GARANTIA DE SATISFAÇÃO</span>
                    Se você não ficar satisfeito com os resultados em até 30 dias, nós devolvemos seu dinheiro.
                  </p>
                </div>
              </div>

            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Main App Components ---

const CountdownTimer = () => {
  const [timeLeft, setTimeLeft] = useState({ minutes: 14, seconds: 59 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { minutes: prev.minutes - 1, seconds: 59 };
        return prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="bg-amber-50 text-amber-700 px-3 py-1.5 rounded-lg border border-amber-200 flex items-center justify-center gap-2 text-xs font-bold">
      <Timer size={14} className="animate-pulse" />
      <span>OFERTA EXPIRA EM: {timeLeft.minutes.toString().padStart(2, '0')}:{timeLeft.seconds.toString().padStart(2, '0')}</span>
    </div>
  );
};

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled ? 'glass-nav py-2' : 'bg-transparent py-4'}`}>
      <div className="max-w-7xl mx-auto px-4 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-rose-600 rounded-lg flex items-center justify-center text-white font-black text-lg">B</div>
          <span className={`font-display text-lg font-bold tracking-tight ${isScrolled ? 'text-slate-900' : 'text-white'}`}>BIONUTRI <span className="text-rose-600">TESTO HARD</span></span>
        </div>
        
        <div className="hidden md:flex items-center gap-6">
          <a href="#beneficios" className={`text-sm font-bold uppercase tracking-wider ${isScrolled ? 'text-slate-600' : 'text-white/80'}`}>Benefícios</a>
          <a href="#ofertas" className={`text-sm font-bold uppercase tracking-wider ${isScrolled ? 'text-slate-600' : 'text-white/80'}`}>Ofertas</a>
          <a href="#ofertas" className="bg-rose-600 text-white px-5 py-2 rounded-lg text-xs font-bold uppercase">Comprar</a>
        </div>

        <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="md:hidden p-2">
          {isMenuOpen ? <X className={isScrolled ? 'text-slate-900' : 'text-white'} /> : <Menu className={isScrolled ? 'text-slate-900' : 'text-white'} />}
        </button>
      </div>

      <AnimatePresence>
        {isMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-full left-0 right-0 bg-white border-b border-slate-200 p-6 flex flex-col gap-4 md:hidden shadow-xl"
          >
            <a href="#beneficios" onClick={() => setIsMenuOpen(false)} className="font-bold text-slate-700 uppercase">Benefícios</a>
            <a href="#ofertas" onClick={() => setIsMenuOpen(false)} className="font-bold text-slate-700 uppercase">Ofertas</a>
            <a href="#faq" onClick={() => setIsMenuOpen(false)} className="font-bold text-slate-700 uppercase">Dúvidas</a>
            <a href="#ofertas" onClick={() => setIsMenuOpen(false)} className="btn-primary">Comprar Agora</a>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};

const Hero = () => {
  return (
    <section className="relative pt-24 pb-12 md:pt-32 md:pb-24 gradient-dark overflow-hidden">
      <div className="max-w-7xl mx-auto px-5 relative z-10">
        <div className="text-center max-w-3xl mx-auto">
          <div className="flex flex-col items-center gap-3 mb-6">
            <span className="bg-rose-600/20 text-rose-400 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border border-rose-600/30">
              Fórmula Original Bionutri
            </span>
            <CountdownTimer />
          </div>
          
          <h1 className="text-4xl md:text-6xl font-black text-white mb-6 leading-tight tracking-tight">
            RECUPERE SUA <span className="text-rose-600">FORÇA</span> E VITALIDADE
          </h1>
          
          <p className="text-base md:text-lg text-slate-300 mb-8">
            Aumente sua massa muscular, energia e performance com o suplemento natural mais vendido do Brasil.
          </p>

          <div className="mb-8">
            <OptimizedImage
              src="https://i.ibb.co/4gZ3ZFyV/image.png" 
              alt="Resultados e Certificações" 
              className="w-full max-w-2xl mx-auto rounded-xl shadow-2xl"
              referrerPolicy="no-referrer"
              priority
            />
          </div>
          
          <div className="flex flex-col items-center gap-4">
            <a href="#ofertas" className="btn-primary w-full md:w-auto flex items-center justify-center gap-2">
              GARANTIR MEU DESCONTO <ArrowRight size={18} />
            </a>
            <div className="flex items-center justify-center gap-2 text-slate-400 text-xs font-bold uppercase">
              <Users size={14} /> +15.000 clientes satisfeitos
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const WhySection = () => {
  const problems = [
    { title: "Baixa Energia", desc: "Sente cansaço constante e falta de ânimo para treinar ou trabalhar?" },
    { title: "Perda de Músculos", desc: "Dificuldade em ganhar massa magra mesmo com dieta e treino?" },
    { title: "Falta de Foco", desc: "Névoa mental e dificuldade de concentração no dia a dia?" },
  ];

  return (
    <section className="py-16 gradient-navy text-white">
      <div className="max-w-7xl mx-auto px-5">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-5xl font-black mb-4">POR QUE VOCÊ <span className="text-rose-600">PRECISA</span> DO TESTO HARD?</h2>
          <p className="text-slate-300 max-w-2xl mx-auto">Após os 30 anos, os níveis naturais de vitalidade começam a cair. O Testo Hard é a solução natural para reverter esse processo.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {problems.map((p, i) => (
            <div key={i} className="bg-white/5 backdrop-blur-sm p-8 rounded-3xl border border-white/10">
              <div className="w-12 h-12 bg-rose-600 text-white rounded-full flex items-center justify-center font-black text-xl mb-6">0{i+1}</div>
              <h3 className="text-xl font-black mb-4 uppercase">{p.title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const Testimonials = () => {
  const reviews = [
    { name: "Ricardo Silva", text: "Em 3 semanas já senti uma diferença absurda na disposição. O treino rende muito mais!", role: "Praticante de Musculação" },
    { name: "Marcos Oliveira", text: "O melhor custo-benefício que já encontrei. Resultados reais sem frescura.", role: "Empresário" },
    { name: "André Santos", text: "Minha libido e energia voltaram ao que eram aos 20 anos. Recomendo demais.", role: "Pai de Família" },
  ];

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-5">
        <h2 className="text-2xl md:text-4xl font-black text-center mb-12">O QUE DIZEM NOSSOS <span className="text-rose-600">CLIENTES</span></h2>
        <div className="grid md:grid-cols-3 gap-6">
          {reviews.map((r, i) => (
            <div key={i} className="p-6 rounded-2xl bg-slate-50 border border-slate-100 italic">
              <div className="flex text-amber-400 mb-4">
                {[1,2,3,4,5].map(s => <Star key={s} size={16} fill="currentColor" />)}
              </div>
              <p className="text-slate-600 text-sm mb-6">"{r.text}"</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-900 rounded-full flex items-center justify-center text-white font-bold">
                  {r.name[0]}
                </div>
                <div>
                  <p className="text-xs font-black uppercase text-slate-900">{r.name}</p>
                  <p className="text-[10px] text-slate-400 uppercase font-bold">{r.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const Benefits = () => {
  const items = [
    { icon: <Dumbbell size={24} />, title: "Massa Muscular", desc: "Estimula a síntese proteica e o ganho de massa magra de forma natural." },
    { icon: <Zap size={24} />, title: "Energia Explosiva", desc: "Disposição máxima para treinos intensos e rotina produtiva." },
    { icon: <Flame size={24} />, title: "Queima de Gordura", desc: "Acelera o metabolismo e auxilia na definição muscular." },
    { icon: <Heart size={24} />, title: "Vigor Masculino", desc: "Melhora a libido, o humor e a vitalidade geral do homem." },
    { icon: <ShieldCheck size={24} />, title: "Saúde Hormonal", desc: "Equilibra os níveis hormonais sem efeitos colaterais." },
    { icon: <Award size={24} />, title: "Qualidade Premium", desc: "Fórmula testada e aprovada com ingredientes de alta pureza." },
  ];

  return (
    <section id="beneficios" className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-5">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-4xl font-black mb-4">MÁXIMA <span className="text-rose-600">PERFORMANCE</span> EM CADA CÁPSULA</h2>
          <p className="text-slate-500 max-w-2xl mx-auto text-sm">Nossa fórmula foi desenvolvida para entregar resultados consistentes e seguros.</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {items.map((item, i) => (
            <div key={i} className="p-6 rounded-2xl bg-slate-50 border border-slate-100 text-center hover:border-rose-100 transition-colors">
              <div className="w-12 h-12 bg-slate-900 text-white rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-slate-900/20">
                {item.icon}
              </div>
              <h3 className="text-sm font-bold mb-2 uppercase">{item.title}</h3>
              <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const Pricing = ({ onSelectOffer }: { onSelectOffer: (offer: Offer) => void }) => {
  const offers: Offer[] = [
    {
      id: 1,
      name: "1 POTE",
      price: "32,90",
      installments: "12x de 3,30",
      image: "https://i.ibb.co/9k4TtCDz/image.png",
      popular: false,
      btnClass: "btn-secondary"
    },
    {
      id: 2,
      name: "2 POTES",
      price: "56,90",
      installments: "12x de 5,71",
      image: "https://i.ibb.co/mVsbqpgS/image.png",
      popular: true,
      btnClass: "btn-primary"
    },
    {
      id: 3,
      name: "3 POTES",
      price: "69,90",
      installments: "12x de 7,02",
      image: "https://i.ibb.co/dJQ22Mtj/image.png",
      popular: false,
      btnClass: "btn-secondary"
    }
  ];

  return (
    <section id="ofertas" className="py-16 bg-slate-50">
      <div className="max-w-7xl mx-auto px-5">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-4xl font-black mb-3">ESCOLHA SEU <span className="text-rose-600">COMBO</span></h2>
          <p className="text-sm text-slate-500">Aproveite os descontos exclusivos de hoje e transforme seu corpo.</p>
        </div>
        
        <div className="flex flex-col gap-6 md:flex-row md:items-stretch">
          {offers.map((offer) => (
            <div
              key={offer.id}
              id={offer.popular ? 'oferta-mais-vendida' : undefined}
              className={`relative flex-1 p-6 rounded-2xl border-2 transition-all ${offer.popular ? 'bg-white border-rose-600 shadow-xl scale-105 z-10' : 'bg-white border-slate-200 opacity-90'}`}
            >
              {offer.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-rose-600 text-white px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest">
                  Mais Vendido
                </div>
              )}
              
              <div className="text-center mb-6">
                <h3 className="font-black text-lg mb-4 uppercase">{offer.name}</h3>
                <OptimizedImage src={offer.image} alt={offer.name} className="h-40 mx-auto mb-6 drop-shadow-lg" referrerPolicy="no-referrer" />
                
                <div className="mb-4">
                  <p className="text-slate-400 line-through text-xs mb-1">
                    De R$ {offer.id === 2 ? '99,90' : offer.id === 3 ? '149,90' : '49,90'}
                  </p>
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-lg font-bold">R$</span>
                    <span className="text-4xl font-black">{offer.price.split(',')[0]}</span>
                    <span className="text-lg font-bold">,{offer.price.split(',')[1]}</span>
                  </div>
                  <p className="text-rose-600 font-bold text-sm mt-1">Ou {offer.installments}</p>
                </div>
              </div>
              
              <ul className="space-y-3 mb-8">
                <li className="flex items-center gap-2 text-xs font-medium text-slate-600"><Check size={14} className="text-green-500" /> 120 Cápsulas por pote</li>
                <li className="flex items-center gap-2 text-xs font-medium text-slate-600"><Check size={14} className="text-green-500" /> Envio imediato</li>
                <li className="flex items-center gap-2 text-xs font-medium text-slate-600"><Check size={14} className="text-green-500" /> Garantia de 30 dias</li>
              </ul>
              
              <button 
                onClick={() => onSelectOffer(offer)}
                className={`${offer.btnClass} w-full text-sm py-3`}
              >
                COMPRAR AGORA
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const FAQ = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const questions = [
    { q: "Como devo tomar o Testo Hard?", a: "Recomenda-se a ingestão de 2 cápsulas ao dia, preferencialmente 30 minutos antes do treino ou logo pela manhã para manter os níveis de energia estáveis." },
    { q: "O produto possui efeitos colaterais?", a: "Não. O Testo Hard é composto por ingredientes 100% naturais e seguros, não apresentando efeitos colaterais quando consumido conforme a recomendação." },
    { q: "Quanto tempo para ver os resultados?", a: "Os primeiros sinais de aumento de energia e disposição costumam aparecer nas primeiras 2 semanas. Ganhos de massa muscular e definição são mais visíveis após 30 a 60 dias de uso contínuo." },
    { q: "Preciso de receita médica?", a: "Não, por ser um suplemento natural, sua venda é livre e não exige prescrição médica." },
    { q: "O site é seguro?", a: "Sim, utilizamos criptografia de ponta a ponta e os gateways de pagamento mais seguros do Brasil para garantir a proteção total dos seus dados." },
    { q: "Qual o prazo de entrega?", a: "O prazo médio é de 3 a 10 dias úteis, dependendo da sua região. O envio é feito via Correios ou transportadora com código de rastreio." },
  ];

  return (
    <section id="faq" className="py-16 bg-white">
      <div className="max-w-2xl mx-auto px-5">
        <h2 className="text-2xl font-black text-center mb-10 uppercase">Dúvidas Frequentes</h2>
        <div className="space-y-3">
          {questions.map((item, i) => (
            <div key={i} className="border border-slate-200 rounded-xl overflow-hidden">
              <button 
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex items-center justify-between p-4 text-left font-bold text-sm text-slate-800"
              >
                {item.q}
                <ChevronDown size={16} className={`transition-transform ${openIndex === i ? 'rotate-180' : ''}`} />
              </button>
              {openIndex === i && (
                <div className="p-4 pt-0 text-xs text-slate-500 leading-relaxed border-t border-slate-50">
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

const Footer = () => {
  return (
    <footer className="bg-slate-900 text-white py-12">
      <div className="max-w-7xl mx-auto px-5 text-center">
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-8 h-8 bg-rose-600 rounded-lg flex items-center justify-center text-white font-black text-lg">B</div>
          <span className="font-display text-lg font-bold tracking-tight">BIONUTRI <span className="text-rose-600">TESTO HARD</span></span>
        </div>
        <p className="text-xs text-slate-400 mb-8 max-w-md mx-auto">
          © {new Date().getFullYear()} Bionutri Suplementos. Todos os direitos reservados.
        </p>
        <div className="flex justify-center gap-6 opacity-50 grayscale h-5 mb-8">
          <OptimizedImage src="https://logodownload.org/wp-content/uploads/2014/07/visa-logo-1.png" alt="Visa" referrerPolicy="no-referrer" />
          <OptimizedImage src="https://logodownload.org/wp-content/uploads/2014/07/mastercard-logo-7.png" alt="Mastercard" referrerPolicy="no-referrer" />
          <OptimizedImage src="https://logodownload.org/wp-content/uploads/2015/03/pix-logo-1.png" alt="Pix" referrerPolicy="no-referrer" />
        </div>
        <p className="text-[10px] text-slate-500 leading-relaxed uppercase tracking-wider">
          AVISO: Este produto não substitui orientações médicas. Resultados podem variar.
        </p>
      </div>
    </footer>
  );
};

export default function App() {
  const [selectedOffer, setSelectedOffer] = useState<Offer | null>(null);
  const handleSelectOffer = (offer: Offer) => {
    window.scrollTo({ top: 0, behavior: 'auto' });
    setSelectedOffer(offer);
  };

  if (selectedOffer) {
    return <Checkout offer={selectedOffer} onBack={() => setSelectedOffer(null)} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-rose-600 selection:text-white">
      <Navbar />
      <Hero />
      
      {/* Marquee */}
      <div className="bg-slate-900 py-3 overflow-hidden">
        <div className="flex whitespace-nowrap animate-marquee">
          {[1,2,3,4].map(i => (
            <div key={i} className="flex items-center gap-6 mx-6 text-white font-display text-sm font-bold uppercase italic">
              <Zap size={16} fill="white" /> RESULTADOS REAIS <Zap size={16} fill="white" /> PERFORMANCE MÁXIMA <Zap size={16} fill="white" /> ENERGIA EXPLOSIVA
            </div>
          ))}
        </div>
      </div>

      {/* Social Proof / Results Image */}
      <section className="py-12 bg-white">
        <OptimizedImage
          src="https://i.ibb.co/21dtr5y3/image.png" 
          alt="Testo Hard" 
          className="w-full max-w-md mx-auto block"
          referrerPolicy="no-referrer"
        />
      </section>

      <WhySection />

      <Benefits />

      {/* Formula / Ingredients Image */}
      <section className="py-16 bg-slate-900">
        <div className="text-center mb-10 px-5">
          <h2 className="text-2xl md:text-4xl font-black uppercase text-white">FÓRMULA <span className="text-rose-600">AVANÇADA</span></h2>
          <p className="text-slate-400 text-xs mt-2 uppercase tracking-widest">Tecnologia de ponta para resultados máximos</p>
        </div>
        <OptimizedImage
          src="https://i.ibb.co/WvwpcN0Y/image.png" 
          alt="Ingredientes e Fórmula" 
          className="w-full"
          referrerPolicy="no-referrer"
        />
      </section>

      <Testimonials />

      {/* Comparison / How it Works Image */}
      <section className="py-16 bg-white">
        <div className="text-center mb-10 px-5">
          <h2 className="text-2xl md:text-4xl font-black uppercase">POR QUE SOMOS <span className="text-rose-600">DIFERENTES</span>?</h2>
          <p className="text-slate-500 text-xs mt-2 uppercase tracking-widest">Compare e comprove a superioridade do Testo Hard</p>
        </div>
        <OptimizedImage
          src="https://i.ibb.co/qYXn1DRG/image.png" 
          alt="Comparativo Testo Hard" 
          className="w-full"
          referrerPolicy="no-referrer"
        />
      </section>

      <Pricing onSelectOffer={handleSelectOffer} />
      <FAQ />
      <Footer />
      
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 15s linear infinite;
        }
      `}</style>
    </div>
  );
}
