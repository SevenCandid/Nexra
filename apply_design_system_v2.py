import re
import sys

def apply_fixes():
    with open('nexra-landing/index.html', 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Navbar Get Started button
    content = content.replace(
        'class="px-2.5 py-1.5 sm:px-4 sm:py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-900 rounded-full text-[9px] sm:text-[10px] font-black transition-all text-white shadow-lg shadow-slate-900/10 whitespace-nowrap uppercase tracking-widest"',
        'class="px-3 py-1.5 sm:px-4 sm:py-2 bg-slate-900 hover:bg-slate-800 border border-slate-900 rounded-lg text-[10px] sm:text-xs font-semibold transition-all text-white shadow-sm whitespace-nowrap"'
    )

    # 2. Hero Section Typography & Buttons
    content = content.replace(
        'class="text-4xl sm:text-7xl lg:text-8xl font-black mb-6 sm:mb-8 leading-tight break-words tracking-tight"',
        'class="text-4xl sm:text-5xl lg:text-6xl font-extrabold mb-5 sm:mb-6 leading-tight break-words tracking-tight"'
    )
    content = content.replace(
        'class="text-base sm:text-2xl text-slate-600 mb-10 sm:mb-14 max-w-3xl mx-auto px-1 leading-relaxed font-light"',
        'class="text-base sm:text-lg text-slate-500 mb-8 sm:mb-10 max-w-2xl mx-auto px-1 leading-relaxed"'
    )
    content = content.replace(
        'class="btn-shine px-12 py-5 bg-slate-900 hover:bg-slate-800 text-white rounded-full font-bold text-lg transition-all transform hover:scale-105 shadow-2xl shadow-slate-900/20 tracking-wide"',
        'class="btn-shine px-8 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold text-sm transition-all transform hover:scale-105 shadow-md shadow-slate-900/10"'
    )

    # 3. Logo Carousel - Handle multiline blocks gracefully
    # We will just replace ALL logo-card class occurrences and their contents up to the next </div>
    # Using a non-greedy regex that doesn't span beyond the closing div.
    def replace_logo_card(match):
        inner = match.group(1)
        img_match = re.search(r'<img[^>]+src="([^"]+)"[^>]*alt="([^"]*)"[^>]*>', inner)
        if img_match:
            src = img_match.group(1)
            alt = img_match.group(2)
        else:
            src = ""
            alt = ""
            
        span_match = re.search(r'<span[^>]*>(.*?)</span>', inner)
        if span_match:
            text = span_match.group(1)
            return f'<div class="flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity duration-300 px-4 flex items-center gap-2"><img src="{src}" alt="{alt}" class="h-6 w-auto grayscale hover:grayscale-0 transition-all duration-300"><span class="font-bold text-slate-500 text-sm">{text}</span></div>'
        else:
            if src:
                return f'<div class="flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity duration-300 px-4"><img src="{src}" alt="{alt}" class="h-6 w-auto grayscale hover:grayscale-0 transition-all duration-300"></div>'
            else:
                return match.group(0)

    content = re.sub(r'<div class="logo-card">(.*?)</div>', replace_logo_card, content, flags=re.DOTALL)

    # 4. Feature Cards
    content = content.replace('gap-6 lg:gap-8', 'gap-px bg-slate-200 border border-slate-200 overflow-hidden rounded-2xl')
    content = content.replace(
        'class="feature-card-glow group relative bg-white border border-slate-200/60 rounded-[2rem] p-8 sm:p-10 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-purple-500/10 transition-all duration-500 hover:-translate-y-2"',
        'class="group bg-white p-6 hover:bg-slate-50 transition-colors duration-200"'
    )
    content = content.replace('rounded-2xl flex items-center justify-center', 'rounded-xl flex items-center justify-center')
    content = content.replace('w-14 h-14', 'w-10 h-10')
    content = content.replace('text-xl font-bold mb-4', 'text-lg font-semibold mb-2')

    # 5. General Section Padding & Headings
    content = content.replace('py-24', 'py-16')
    content = content.replace('text-3xl sm:text-5xl', 'text-2xl sm:text-3xl')
    
    # Other big border radii
    content = content.replace('rounded-[2.5rem]', 'rounded-2xl')
    content = content.replace('rounded-[2rem]', 'rounded-xl')

    # 6. ROI Calculator
    content = content.replace('p-6 sm:p-12', 'p-6 sm:p-8')
    content = content.replace('gap-16 items-center', 'gap-8 items-center')
    
    # 7. Testimonials
    content = content.replace('p-10 sm:p-14', 'p-8 sm:p-10')

    # 8. FAQ
    content = content.replace('rounded-3xl p-6', 'rounded-xl p-5')
    
    # 9. Final CTA
    content = content.replace(
        'class="p-8 sm:p-16 rounded-[2.5rem] bg-white border border-slate-200 relative overflow-hidden shadow-2xl"',
        'class="p-8 sm:p-12 rounded-xl bg-white border border-slate-200 relative overflow-hidden shadow-xl"'
    )
    content = content.replace(
        'class="btn-shine w-full sm:w-auto px-10 py-5 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 text-white rounded-full font-bold transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-purple-500/25 whitespace-nowrap text-center"',
        'class="btn-shine w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-700 hover:to-cyan-700 text-white rounded-lg font-bold transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-sm shadow-purple-500/25 whitespace-nowrap text-center"'
    )
    content = content.replace(
        'class="w-full sm:w-auto px-10 py-5 bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 rounded-full font-bold transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-slate-200/50 whitespace-nowrap text-center"',
        'class="w-full sm:w-auto px-6 py-3 bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 rounded-lg font-bold transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-sm shadow-slate-200/50 whitespace-nowrap text-center"'
    )
    
    # 10. Support section
    content = content.replace(
        'px-6 py-4 bg-white border border-slate-200 rounded-2xl',
        'px-5 py-2.5 bg-white border border-slate-200 rounded-lg'
    )

    with open('nexra-landing/index.html', 'w', encoding='utf-8') as f:
        f.write(content)

    print("HTML modifications applied successfully.")

if __name__ == "__main__":
    apply_fixes()
